import checkoutNodeJssdk from '@paypal/checkout-server-sdk'
import mongoose from 'mongoose'
import Stripe from 'stripe'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import { Cart } from '../models/cart.model.js'
import { Order } from '../models/order.model.js'
import { Product } from '../models/product.model.js'
import { User } from '../models/user.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getOrderConfirmationTemplate, getStatusEmailTemplate } from '../utils/htmlTemplates.js'
import logger from '../utils/logger.js'
import { sendEmail } from '../utils/sendEmail.js'

const paypalEnv = new checkoutNodeJssdk.core.SandboxEnvironment(
  environment.paypal.clientId,
  environment.paypal.clientSecret,
)

const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(paypalEnv)

const stripe = environment?.stripe?.secretKey ? new Stripe(environment.stripe.secretKey) : null

const FREE_SHIPPING_THRESHOLD = 1000
const SHIPPING_FEE = 50
const TAX_RATE = 0.14

const getPagination = async (model, query = {}, page, limit) => {
  const currentPage = Math.max(Number(page) || 1, 1)
  const currentLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)
  const skip = (currentPage - 1) * currentLimit

  const totalItems = await model.countDocuments(query)
  const totalPages = Math.ceil(totalItems / currentLimit)

  return {
    currentPage,
    currentLimit,
    skip,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  }
}

const calculateOrderTotals = (cart) => {
  const subtotal = cart.items.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0,
  )
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  const tax = Number((subtotal * TAX_RATE).toFixed(2))
  const discount = Number((cart.discountAmount || 0).toFixed(2))
  const totalPrice = Number((subtotal + shippingFee + tax - discount).toFixed(2))
  return { subtotal: Number(subtotal.toFixed(2)), shippingFee, tax, discount, totalPrice }
}

const allowedStatusTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

const isValidStatusTransition = (currentStatus, nextStatus) => {
  const allowedStatuses = allowedStatusTransitions[currentStatus] || []
  return allowedStatuses.includes(nextStatus)
}

/*
|--------------------------------------------------------------------------
| 1. CREATE ORDER (Supports: cash, stripe, paypal, paymob)
|--------------------------------------------------------------------------
*/

export const createOrder = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession()
  let createdOrder = null
  let paymentGatewayData = null

  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.user._id })
        .populate('items.product')
        .session(session)

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new AppError('Cannot create an order from an empty cart', HTTP_STATUS.BAD_REQUEST)
      }

      for (const item of cart.items) {
        const product = item.product
        if (!product || !product.isActive) {
          throw new AppError('Product is no longer available', HTTP_STATUS.BAD_REQUEST)
        }
        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for product: ${product.name}`,
            HTTP_STATUS.BAD_REQUEST,
          )
        }
      }

      const totals = calculateOrderTotals(cart)
      const orderItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.name || item.product.name,
        image: item.image || item.product.images?.[0]?.url || '',
        price: item.price,
        quantity: item.quantity,
      }))

      const paymentMethod = req.body.paymentMethod || 'cash'
      const validMethods = ['cash', 'stripe', 'paypal', 'paymob']
      if (!validMethods.includes(paymentMethod)) {
        throw new AppError('Invalid payment method selected', HTTP_STATUS.BAD_REQUEST)
      }

      for (const item of cart.items) {
        await Product.updateOne(
          { _id: item.product._id },
          { $inc: { stock: -item.quantity } },
          { session },
        )
      }

      const [order] = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            shippingAddress: req.body.shippingAddress,
            paymentMethod,
            paymentStatus: 'pending',
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            tax: totals.tax,
            discount: totals.discount,
            totalPrice: totals.totalPrice,
            status: 'pending',
            customerNote: req.body.customerNote,
          },
        ],
        { session },
      )

      createdOrder = order

      cart.items = []
      cart.coupon = undefined
      cart.discountAmount = 0
      await cart.save({ session })
    })

    if (createdOrder.paymentMethod === 'stripe') {
      if (!stripe) throw new AppError('Stripe is not configured', HTTP_STATUS.INTERNAL_ERROR)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(createdOrder.totalPrice * 100),
        currency: 'egp',
        metadata: { orderId: createdOrder._id.toString() },
      })
      createdOrder.transactionId = paymentIntent.id
      await createdOrder.save()
      paymentGatewayData = { clientSecret: paymentIntent.client_secret }
    } else if (createdOrder.paymentMethod === 'paypal') {
      const auth = Buffer.from(
        `${environment.paypal.clientId}:${environment.paypal.clientSecret}`,
      ).toString('base64')

      const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const tokenData = await tokenResponse.json()
      if (!tokenResponse.ok) {
        throw new AppError('Failed to authenticate with PayPal', HTTP_STATUS.INTERNAL_ERROR)
      }
      const accessToken = tokenData.access_token

      const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: createdOrder._id.toString(),
              amount: {
                currency_code: 'USD',
                value: createdOrder.totalPrice.toFixed(2),
              },
            },
          ],
          application_context: {
            return_url: `${environment.clientUrl}/payment/success`,
            cancel_url: `${environment.clientUrl}/payment/cancel`,
          },
        }),
      })

      const paypalData = await response.json()
      if (!response.ok) {
        throw new AppError('Failed to create PayPal payment order', HTTP_STATUS.INTERNAL_ERROR)
      }

      const approvalUrl = paypalData.links.find((link) => link.rel === 'approve')?.href
      if (!approvalUrl) {
        throw new AppError('PayPal approval URL not found', HTTP_STATUS.INTERNAL_ERROR)
      }

      createdOrder.transactionId = paypalData.id
      await createdOrder.save()
      paymentGatewayData = { paypalApprovalUrl: approvalUrl }
    } else if (createdOrder.paymentMethod === 'paymob') {
      const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: environment.paymob.paymob_ApiKey }),
      })
      const authData = await authResponse.json()
      if (!authResponse.ok) {
        throw new AppError('Failed to authenticate with Paymob', HTTP_STATUS.INTERNAL_ERROR)
      }
      const authToken = authData.token

      const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: 'false',
          amount_cents: Math.round(createdOrder.totalPrice * 100),
          currency: 'EGP',
          merchant_order_id: createdOrder._id.toString(),
          items: [],
        }),
      })
      const orderData = await orderResponse.json()
      if (!orderResponse.ok) {
        throw new AppError('Failed to register order with Paymob', HTTP_STATUS.INTERNAL_ERROR)
      }

      const paymentKeyResponse = await fetch(
        'https://accept.paymob.com/api/acceptance/payment_keys',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_token: authToken,
            amount_cents: Math.round(createdOrder.totalPrice * 100),
            expiration: 3600,
            order_id: orderData.id,
            billing_data: {
              apartment: 'NA',
              email: req.user.email || 'test@test.com',
              floor: 'NA',
              first_name: req.user.username || 'Customer',
              street: 'NA',
              building: 'NA',
              phone_number: req.user.phone || '01000000000',
              shipping_method: 'NA',
              postal_code: 'NA',
              city: 'Cairo',
              country: 'EGY',
              last_name: 'NA',
              state: 'NA',
            },
            currency: 'EGP',
            integration_id: Number(environment.paymob.paymob_id),
          }),
        },
      )
      const paymentKeyData = await paymentKeyResponse.json()
      if (!paymentKeyResponse.ok) {
        throw new AppError('Failed to generate Paymob payment key', HTTP_STATUS.INTERNAL_ERROR)
      }

      createdOrder.transactionId = orderData.id.toString()
      await createdOrder.save()
      paymentGatewayData = { paymobPaymentToken: paymentKeyData.token }
    }

    const user = await User.findById(req.user._id).select('username email')
    try {
      await sendEmail({
        to: user.email,
        subject: `Order Confirmation - #${createdOrder._id}`,
        html: getOrderConfirmationTemplate(createdOrder, user.username),
      })
    } catch (emailError) {
      logger.error({ message: 'Failed to send confirmation email', error: emailError })
    }

    return res.status(HTTP_STATUS.CREATED).send(
      ApiResponse(
        {
          order: createdOrder,
          ...paymentGatewayData,
        },
        'Order created successfully.',
      ),
    )
  } catch (error) {
    return next(error)
  } finally {
    await session.endSession()
  }
})

/*
|--------------------------------------------------------------------------
| 2. GET MY ORDERS & DETAILS & CANCELLATION
|--------------------------------------------------------------------------
*/

export const getMyOrders = asyncHandler(async (req, res, next) => {
  const { currentPage, currentLimit, skip } = await getPagination(
    Order,
    { user: req.user._id },
    req.query.page,
    req.query.limit,
  )
  const filter = { user: req.user._id }
  if (req.query.status) filter.status = req.query.status

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(currentLimit),
    Order.countDocuments(filter),
  ])

  return res.status(HTTP_STATUS.OK).send(
    ApiResponse(
      {
        orders,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalOrders,
          totalPages: Math.ceil(totalOrders / currentLimit),
        },
      },
      'Orders fetched successfully.',
    ),
  )
})

export const getMyOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  return res.status(HTTP_STATUS.OK).send(ApiResponse({ order }, 'Order fetched successfully.'))
})

export const cancelOrder = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession()
  let cancelledOrder = null
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).session(session)
      if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new AppError('Order cannot be cancelled at this stage', HTTP_STATUS.BAD_REQUEST)
      }

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
          { session },
        )
      }

      order.status = 'cancelled'
      order.cancelledAt = new Date()
      await order.save({ session })
      cancelledOrder = order
    })

    const user = await User.findById(req.user._id).select('username email')
    try {
      await sendEmail({
        to: user.email,
        subject: `Order Cancelled - #${cancelledOrder._id}`,
        html: getStatusEmailTemplate(cancelledOrder._id, 'cancelled', user.username),
      })
    } catch (emailError) {
      logger.error({ message: 'Failed to send email', error: emailError })
    }

    return res
      .status(HTTP_STATUS.OK)
      .send(ApiResponse({ order: cancelledOrder }, 'Order cancelled successfully.'))
  } catch (error) {
    return next(error)
  } finally {
    await session.endSession()
  }
})

/*
|--------------------------------------------------------------------------
| 3. ADMIN CONTROLLERS
|--------------------------------------------------------------------------
*/

export const getAllOrders = asyncHandler(async (req, res, next) => {
  const { currentPage, currentLimit, skip } = await getPagination(
    Order,
    {},
    req.query.page,
    req.query.limit,
  )
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate('user', 'username email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(currentLimit),
    Order.countDocuments(filter),
  ])

  return res.status(HTTP_STATUS.OK).send(
    ApiResponse(
      {
        orders,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          totalOrders,
          totalPages: Math.ceil(totalOrders / currentLimit),
        },
      },
      'All orders fetched successfully.',
    ),
  )
})

export const getAdminOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'username email phone')
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse({ order }, 'Order details fetched successfully.'))
})

export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, adminNote } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  if (status && !isValidStatusTransition(order.status, status)) {
    throw new AppError(
      `Invalid status transition from "${order.status}" to "${status}"`,
      HTTP_STATUS.BAD_REQUEST,
    )
  }

  if (status) {
    order.status = status
    if (status === 'delivered') {
      order.deliveredAt = new Date()
      if (order.paymentMethod === 'cash') {
        order.paymentStatus = 'paid'
        order.paidAt = new Date()
      }
    }
  }

  if (adminNote !== undefined) order.adminNote = adminNote
  await order.save()

  const user = await User.findById(order.user).select('username email')
  if (user && status) {
    try {
      await sendEmail({
        to: user.email,
        subject: `Order Status Update - #${order._id}`,
        html: getStatusEmailTemplate(order._id, status, user.username),
      })
    } catch (emailError) {
      logger.error({ message: 'Failed to send email', error: emailError })
    }
  }

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse({ order }, 'Order status updated successfully.'))
})

export const AdminOrderDashboard = asyncHandler(async (req, res, next) => {
  const totalOrders = await Order.countDocuments()
  const totalRevenueResult = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
  ])
  const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0
  const statusCounts = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])

  return res
    .status(HTTP_STATUS.OK)
    .send(
      ApiResponse(
        { totalOrders, totalRevenue, statusCounts },
        'Dashboard stats fetched successfully.',
      ),
    )
})

export const AdminOrderCarts = asyncHandler(async (req, res, next) => {
  const carts = await Cart.find().populate('user', 'username email')
  return res.status(HTTP_STATUS.OK).send(ApiResponse({ carts }, 'Carts fetched successfully.'))
})

/*
|--------------------------------------------------------------------------
| 4. DEDICATED WEBHOOKS FOR EACH PAYMENT METHOD
|--------------------------------------------------------------------------
*/

// A. Stripe Webhook
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, environment.stripe.webhookSecret)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const orderId = paymentIntent.metadata.orderId
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'paid',
      status: 'confirmed',
      paidAt: new Date(),
    })
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object
    const orderId = paymentIntent.metadata.orderId
    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' })
  }

  return res.status(200).send({ received: true })
}

// B. PayPal Webhook
export const handlePaypalWebhook = async (req, res) => {
  const event = req.body
  if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
    const resource = event.resource
    const orderId = resource.custom_id || resource.invoice_id
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(),
      })
    }
  } else if (event.event_type === 'PAYMENT.SALE.DENIED') {
    const orderId = event.resource.custom_id
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' })
    }
  }

  return res.status(200).send({ received: true })
}

// C. Paymob Webhook
export const handlePaymobWebhook = async (req, res) => {
  const eventData = req.body
  const obj = eventData.obj
  if (obj && obj.success === true) {
    const orderId = obj.order?.merchant_order_id
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(),
      })
    }
  } else if (obj && obj.success === false) {
    const orderId = obj.order?.merchant_order_id
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' })
    }
  }

  return res.status(200).send({ received: true })
}
