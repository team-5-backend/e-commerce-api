import crypto from 'crypto'

import mongoose from 'mongoose'
import { Stripe } from 'stripe'

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
import { getPaginatedData } from '../utils/pagination.js'
import {
  processPaymobPayment,
  processPaypalPayment,
  processStripePayment,
} from '../utils/payment.js'
import { sendEmail } from '../utils/sendEmail.js'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const stripe = new Stripe(environment.stripe.secretKey)

const calculateOrderTotals = (cart) => {
  if (!cart || !Array.isArray(cart.items)) {
    return { subtotal: 0, shippingFee: 0, tax: 0, discount: 0, totalPrice: 0 }
  }

  const subtotal = cart.items.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0,
  )

  const shippingFee =
    subtotal >= environment.checkout.freeShippingThreshold ? 0 : environment.checkout.shippingFee

  const discount = Number((cart.discountAmount || 0).toFixed(2))
  const taxableAmount = Math.max(0, subtotal - discount)
  const tax = Number((taxableAmount * environment.checkout.taxRate).toFixed(2))

  const rawTotal = subtotal + shippingFee + tax - discount
  const totalPrice = Math.max(0, Number(rawTotal.toFixed(2)))

  return {
    subtotal: Number(subtotal.toFixed(2)),
    shippingFee,
    tax,
    discount,
    totalPrice,
  }
}

const validateStatusTransition = (currentStatus, nextStatus) => {
  const allowedStatusTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped'],
    shipped: ['delivered'],
    delivered: ['returned'],
    cancelled: [],
    returned: [],
  }

  const allowedStatuses = allowedStatusTransitions[currentStatus] || []
  return allowedStatuses.includes(nextStatus)
}

/*
|--------------------------------------------------------------------------
| Create Order
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

      if (!cart || !cart.items.length) {
        throw new AppError('Cannot create an order from an empty cart.', HTTP_STATUS.BAD_REQUEST)
      }

      for (const item of cart.items) {
        if (!item.product?.isActive)
          throw new AppError('Product unavailable.', HTTP_STATUS.BAD_REQUEST)
        if (item.product.stock < item.quantity)
          throw new AppError(`Insufficient stock: ${item.product.name}.`, HTTP_STATUS.BAD_REQUEST)
      }

      const totals = calculateOrderTotals(cart)
      const validMethods = ['cash', 'stripe', 'paypal', 'paymob']
      const paymentMethod = req.body.paymentMethod || 'cash'

      if (!validMethods.includes(paymentMethod)) {
        throw new AppError('Invalid payment method.', HTTP_STATUS.BAD_REQUEST)
      }

      await Promise.all(
        cart.items.map((item) =>
          Product.updateOne(
            { _id: item.product._id },
            { $inc: { stock: -item.quantity } },
            { session },
          ),
        ),
      )

      const orderItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.name || item.product.name,
        image: item.image || item.product.images?.[0]?.url || '',
        price: item.price,
        quantity: item.quantity,
      }))

      const [order] = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            shippingAddress: req.body.shippingAddress,
            paymentMethod,
            paymentStatus: 'pending',
            ...totals,
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
      paymentGatewayData = await processStripePayment(createdOrder)
    } else if (createdOrder.paymentMethod === 'paypal') {
      paymentGatewayData = await processPaypalPayment(createdOrder)
    } else if (createdOrder.paymentMethod === 'paymob') {
      paymentGatewayData = await processPaymobPayment(createdOrder, req.user)
    }

    if (paymentGatewayData?.transactionId) {
      createdOrder.transactionId = paymentGatewayData.transactionId
      await createdOrder.save()
      delete paymentGatewayData.transactionId
    }

    const user = await User.findById(req.user._id).select('username email').lean().exec()
    sendEmail({
      to: user.email,
      subject: `Order Confirmation - #${createdOrder._id}`,
      html: getOrderConfirmationTemplate(createdOrder, user.username),
    }).catch((error) => logger.error({ message: 'Failed to send confirmation email', error }))

    return res
      .status(HTTP_STATUS.CREATED)
      .send(
        ApiResponse('Order created successfully.', { order: createdOrder, ...paymentGatewayData }),
      )
  } catch (error) {
    return next(error)
  } finally {
    await session.endSession()
  }
})

/*
|--------------------------------------------------------------------------
| Get Orders
|--------------------------------------------------------------------------
*/

export const getMyOrders = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id }
  if (req.query.status) filter.status = req.query.status

  const responseData = await getPaginatedData(Order, filter, req.query.page, req.query.limit, {
    createdAt: -1,
  })

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Orders fetched successfully.', responseData))
})

/*
|--------------------------------------------------------------------------
| Get Order by Id
|--------------------------------------------------------------------------
*/

export const getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Order fetched successfully.', { order }))
})

/*
|--------------------------------------------------------------------------
| Cancel Order
|--------------------------------------------------------------------------
*/

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

      await Promise.all(
        order.items.map((item) =>
          Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session }),
        ),
      )

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
      .send(ApiResponse('Order cancelled successfully.', { order: cancelledOrder }))
  } catch (error) {
    return next(error)
  } finally {
    await session.endSession()
  }
})

/*
|--------------------------------------------------------------------------
| ADMIN CONTROLLERS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get All Orders
|--------------------------------------------------------------------------
*/

export const getAllOrders = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod

  const populateOptions = [{ path: 'user', select: 'username email phone' }]

  const responseData = await getPaginatedData(
    Order,
    filter,
    req.query.page,
    req.query.limit,
    '-createdAt',
    populateOptions,
  )

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('All orders fetched successfully.', responseData))
})

/*
|--------------------------------------------------------------------------
| Get Order by Id for Admin
|--------------------------------------------------------------------------
*/

export const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'username email phone')
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Order details fetched successfully.', { order }))
})

/*
|--------------------------------------------------------------------------
| Update Order Status
|--------------------------------------------------------------------------
*/

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  if (status && !validateStatusTransition(order.status, status)) {
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
    .send(ApiResponse('Order status updated successfully.', { order }))
})

/*
|--------------------------------------------------------------------------
| Admin Order Analytics
|--------------------------------------------------------------------------
*/

export const AdminOrderDashboard = asyncHandler(async (_, res) => {
  const totalOrders = await Order.countDocuments()
  const totalRevenueResult = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
  ])
  const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0
  const statusCounts = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])

  return res.status(HTTP_STATUS.OK).send(
    ApiResponse('Dashboard stats fetched successfully.', {
      totalOrders,
      totalRevenue,
      statusCounts,
    }),
  )
})

/*
|--------------------------------------------------------------------------
| Admin Carts Analytics
|--------------------------------------------------------------------------
*/

export const AdminCartsDashboard = asyncHandler(async (req, res) => {
  const populateOptions = [{ path: 'user', select: 'username email' }]
  const responseData = await getPaginatedData(
    Cart,
    {},
    req.query.page,
    req.query.limit,
    '-createdAt',
    populateOptions,
  )

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Carts fetched successfully.', responseData))
})

/*
|--------------------------------------------------------------------------
| Dedicated Webhooks
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
  const auth = Buffer.from(
    `${environment.paypal.clientId}:${environment.paypal.clientSecret}`,
  ).toString('base64')
  const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  const { access_token } = await tokenRes.json()

  const verifyRes = await fetch(
    'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_time: req.headers['paypal-transmission-time'],
        cert_url: req.headers['paypal-cert-url'],
        auth_algo: req.headers['paypal-auth-algo'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        webhook_id: environment.paypal.webhookId,
        webhook_event: req.body,
      }),
    },
  )

  const verifyData = await verifyRes.json()
  if (verifyData.verification_status !== 'SUCCESS') {
    return res.status(400).send('Invalid PayPal Webhook Signature')
  }

  const event = req.body
  if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
    const orderId = event.resource.custom_id || event.resource.invoice_id
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
  const hmacHeader = req.query.hmac
  if (!hmacHeader) return res.status(401).send('Missing HMAC')

  const {
    amount_cents,
    created_at,
    currency,
    error_occured,
    has_parent_transaction,
    id,
    integration_id,
    is_3d_secure,
    is_auth,
    is_capture,
    is_refunded,
    is_standalone_payment,
    is_voided,
    order,
    owner,
    pending,
    source_data,
    success,
  } = req.body.obj

  // Strict Paymob Concatenation Order (DO NOT CHANGE)
  const concatenatedString = `${amount_cents}${created_at}${currency}${error_occured}${has_parent_transaction}${id}${integration_id}${is_3d_secure}${is_auth}${is_capture}${is_refunded}${is_standalone_payment}${is_voided}${order.id}${owner}${pending}${source_data.pan}${source_data.sub_type}${source_data.type}${success}`

  // Hash with your Paymob HMAC Secret (ensure you add this to environment.js and .env)
  const hashedHMAC = crypto
    .createHmac('sha512', environment.paymob.hmacSecret)
    .update(concatenatedString)
    .digest('hex')

  if (hashedHMAC !== hmacHeader) {
    return res.status(401).send('Invalid HMAC signature')
  }

  const obj = req.body.obj
  const orderId = obj.order?.merchant_order_id

  if (orderId) {
    if (obj.success === true) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(),
      })
    } else {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' })
    }
  }

  return res.status(200).send({ received: true })
}
