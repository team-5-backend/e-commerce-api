import crypto from 'crypto'

import mongoose from 'mongoose'
// oxlint-disable-next-line import/no-named-as-default
import Stripe from 'stripe'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { Cart, Order, Product, User } from '../models/index.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { AppError } from '../utils/appError.js'
import { getOrderConfirmationTemplate, getStatusEmailTemplate } from '../utils/htmlTemplates.js'
import logger from '../utils/logger.js'
import { sendEmail } from '../utils/sendEmail.js'

//////////////////////////////////////////////////////

const stripe = environment?.stripe?.secretKey ? new Stripe(environment.stripe.secretKey) : null

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
  const shippingFee =
    subtotal >= environment.checkout.freeShippingThreshold ? 0 : environment.checkout.shippingFee
  const tax = Number((subtotal * environment.checkout.taxRate).toFixed(2))
  const discount = Number((cart.discountAmount || 0).toFixed(2))
  const totalPrice = Number((subtotal + shippingFee + tax - discount).toFixed(2))
  return { subtotal: Number(subtotal.toFixed(2)), shippingFee, tax, discount, totalPrice }
}

const allowedStatusTransitions = {
  pending: ['confirmed'],
  confirmed: ['processing'],
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

//////////////////////////////////////////////////////

export const createOrder = asyncHandler(async (req, res) => {
  const paymentMethod = req.body.paymentMethod || 'cash'
  const validMethods = ['cash', 'stripe', 'paypal', 'paymob']
  if (!validMethods.includes(paymentMethod)) {
    throw new AppError('Invalid payment method selected', HTTP_STATUS.BAD_REQUEST)
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product')
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError('Cannot create an order from an empty cart', HTTP_STATUS.BAD_REQUEST)
  }

  await Promise.all(
    cart.items.map(async (cartItem) => {
      const product = await Product.findOne({ _id: cartItem.product._id, isActive: true })
      if (!product || product.stock < cartItem.quantity) {
        throw new AppError(
          `Product unavailable or insufficient stock: ${product?.name || 'Item'}`,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
    }),
  )

  const totals = calculateOrderTotals(cart)
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.name || item.product.name,
    image: item.image || item.product.images?.[0]?.url || '',
    price: item.price,
    quantity: item.quantity,
  }))

  const customOrderId = new mongoose.Types.ObjectId()
  let paymentGatewayData = null
  let gatewayTransactionId = null

  if (paymentMethod === 'stripe') {
    if (!stripe) throw new AppError('Stripe is not configured', HTTP_STATUS.INTERNAL_ERROR)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totals.totalPrice * 100),
      currency: 'egp',
      metadata: { orderId: customOrderId.toString() },
    })
    gatewayTransactionId = paymentIntent.id
    paymentGatewayData = { clientSecret: paymentIntent.client_secret }
  } else if (paymentMethod === 'paypal') {
    const clientOrigin =
      req.headers.origin && environment.allowedOrigins?.includes(req.headers.origin)
        ? req.headers.origin
        : environment.clientUrl || environment.allowedOrigins?.[0] || 'http://localhost:3000'
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
    if (!tokenResponse.ok)
      throw new AppError('Failed to authenticate with PayPal', HTTP_STATUS.INTERNAL_ERROR)

    const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: customOrderId.toString(),
            amount: { currency_code: 'USD', value: totals.totalPrice.toFixed(2) },
          },
        ],
        application_context: {
          return_url: `${clientOrigin}/payment/success`,
          cancel_url: `${clientOrigin}/payment/cancel`,
        },
      }),
    })
    const paypalData = await response.json()
    if (!response.ok) {
      throw new AppError('Failed to create PayPal payment order', HTTP_STATUS.INTERNAL_ERROR)
    }
    const approvalUrl = paypalData.links.find((link) => link.rel === 'approve')?.href
    gatewayTransactionId = paypalData.id
    paymentGatewayData = { paypalApprovalUrl: approvalUrl }
  } else if (paymentMethod === 'paymob') {
    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: environment.paymob.paymobApiKey }),
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
        amount_cents: Math.round(totals.totalPrice * 100),
        currency: 'EGP',
        merchant_order_id: customOrderId.toString(),
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
          amount_cents: Math.round(totals.totalPrice * 100),
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
          integration_id: Number(environment.paymob.paymobId),
        }),
      },
    )
    const paymentKeyData = await paymentKeyResponse.json()
    if (!paymentKeyResponse.ok) {
      throw new AppError('Failed to generate Paymob payment key', HTTP_STATUS.INTERNAL_ERROR)
    }

    gatewayTransactionId = orderData.id.toString()
    paymentGatewayData = { paymobPaymentToken: paymentKeyData.token }
  }

  let createdOrder = null

  if (paymentMethod === 'cash') {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const [order] = await Order.create(
          [
            {
              _id: customOrderId,
              user: req.user._id,
              items: orderItems,
              shippingAddress: req.body.shippingAddress,
              paymentMethod,
              paymentStatus: 'pending',
              transactionId: `CASH_${customOrderId}1245 `,
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

        await Cart.findOneAndUpdate(
          { user: req.user._id },
          { $set: { items: [], coupon: undefined, discountAmount: 0 } },
          { session },
        )
      })
    } finally {
      await session.endSession()
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

    return res
      .status(HTTP_STATUS.CREATED)
      .send(ApiResponse('Order created successfully', { order: createdOrder }))
  } else {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        createdOrder = await Order.create(
          [
            {
              _id: customOrderId,
              user: req.user._id,
              items: orderItems,
              shippingAddress: req.body.shippingAddress,
              paymentMethod,
              paymentStatus: 'pending',
              transactionId: gatewayTransactionId,
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
        createdOrder = createdOrder[0]
      })
    } finally {
      await session.endSession()
    }

    return res.status(HTTP_STATUS.CREATED).send(
      ApiResponse('Payment initialization successful', {
        order: createdOrder,
        ...paymentGatewayData,
      }),
    )
  }
})

//////////////////////////////////////////////////////

export const getMyOrders = asyncHandler(async (req, res) => {
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

  if (totalOrders === 0) {
    throw new AppError('No orders found', HTTP_STATUS.NOT_FOUND)
  }

  return res.status(HTTP_STATUS.OK).send(
    ApiResponse('Orders fetched successfully', {
      orders,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / currentLimit),
      },
    }),
  )
})

//////////////////////////////////////////////////////

export const getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Order fetched successfully', { order }))
})

//////////////////////////////////////////////////////

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
        order.items.map(async (item) => {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session },
          )
        }),
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
      .send(ApiResponse('Order cancelled successfully', { order: cancelledOrder }))
  } catch (error) {
    return next(error)
  } finally {
    await session.endSession()
  }
})

//////////////////////////////////////////////////////

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

  if (!orders || orders.length === 0) {
    return next(new AppError('No orders found', HTTP_STATUS.NOT_FOUND))
  }
  return res.status(HTTP_STATUS.OK).send(
    ApiResponse('All orders fetched successfully', {
      orders,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / currentLimit),
      },
    }),
  )
})

//////////////////////////////////////////////////////

export const getAdminOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'username email phone')
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND)

  return res
    .status(HTTP_STATUS.OK)
    .send(ApiResponse('Order details fetched successfully', { order }))
})

//////////////////////////////////////////////////////

export const updateOrderStatus = asyncHandler(async (req, res) => {
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
    .send(ApiResponse('Order status updated successfully', { order }))
})

//////////////////////////////////////////////////////

export const AdminOrderDashboard = asyncHandler(async (_, res) => {
  const totalOrders = await Order.countDocuments()

  if (totalOrders === 0) {
    throw new AppError('No orders or statistics found', HTTP_STATUS.NOT_FOUND)
  }

  const totalRevenueResult = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
  ])
  const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0
  const statusCounts = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])

  return res.status(HTTP_STATUS.OK).send(
    ApiResponse('Dashboard stats fetched successfully', {
      totalOrders,
      totalRevenue,
      statusCounts,
    }),
  )
})

//////////////////////////////////////////////////////

export const AdminOrderCarts = asyncHandler(async (_, res) => {
  const carts = await Cart.find().populate('user', 'username email')

  if (!carts || carts.length === 0) {
    throw new AppError('No carts found', HTTP_STATUS.NOT_FOUND)
  }

  return res.status(HTTP_STATUS.OK).send(ApiResponse('Carts fetched successfully', { carts }))
})

//////////////////////////////////////////////////////

async function handleOrderSuccess(orderQuery) {
  const session = await mongoose.startSession()
  try {
    let order = null
    await session.withTransaction(async () => {
      order = await Order.findOneAndUpdate(
        { ...orderQuery, paymentStatus: { $ne: 'paid' } },
        { paymentStatus: 'paid', status: 'confirmed', paidAt: new Date() },
        { new: true, session, sort: { createdAt: -1 } },
      )

      if (!order) return

      await Cart.findOneAndUpdate(
        { user: order.user },
        { $set: { items: [], coupon: undefined, discountAmount: 0 } },
        { session },
      )
    })

    if (order) {
      try {
        const user = await User.findById(order.user).select('username email')
        if (user) {
          await sendEmail({
            to: user.email,
            subject: `Order Confirmation - #${order._id}`,
            html: getOrderConfirmationTemplate(order, user.username),
          })
        }
      } catch (emailError) {
        logger.error({
          message: 'Failed to send confirmation email via webhook',
          error: emailError,
        })
      }
    }

    return order
  } finally {
    await session.endSession()
  }
}

//////////////////////////////////////////////////////

export const handleStripeWebhook = asyncHandler(async (req, res) => {
  let event

  if (environment.isProduction) {
    const sig = req.headers['stripe-signature']

    if (!sig) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .send('Webhook Error: Missing stripe-signature header')
    }

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, environment.stripe.webhookSecret)
    } catch (err) {
      logger.error({ message: `Stripe Webhook Signature Verification Failed: ${err.message}` })
      return res.status(HTTP_STATUS.BAD_REQUEST).send(`Webhook Error: ${err.message}`)
    }
  } else {
    event = req.body
  }

  const paymentIntent = event.data.object
  const orderId = paymentIntent.metadata?.orderId

  if (event.type === 'payment_intent.succeeded') {
    const query = orderId ? { _id: orderId } : { paymentStatus: 'pending' }
    await handleOrderSuccess(query)
  } else if (event.type === 'payment_intent.payment_failed') {
    const query = orderId
      ? { _id: orderId, paymentStatus: { $ne: 'failed' } }
      : { paymentStatus: 'pending' }

    const failedOrder = await Order.findOneAndUpdate(
      query,
      { paymentStatus: 'failed', status: 'cancelled' },
      { new: true, sort: { createdAt: -1 } },
    )

    if (failedOrder && failedOrder.items) {
      logger.info({ message: `Order ${failedOrder._id} failed and stock restored successfully.` })
    }
  }

  return res.status(HTTP_STATUS.OK).send({ received: true })
})

//////////////////////////////////////////////////////

export const handlePaypalWebhook = asyncHandler(async (req, res) => {
  let event = req.body

  if (environment.isProduction) {
    const transmissionId = req.headers['paypal-transmission-id']
    const timestamp = req.headers['paypal-transmission-time']
    const webhookId = environment.paypal.webhookId
    const certUrl = req.headers['paypal-cert-url']
    const signature = req.headers['paypal-transmission-sig']
    const authAlgo = req.headers['paypal-auth-algo']

    if (!transmissionId || !signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Missing PayPal signature headers' })
    }

    try {
      const auth = Buffer.from(
        `${environment.paypal.clientId}:${environment.paypal.clientSecret}`,
      ).toString('base64')
      const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      const tokenData = await tokenResponse.json()

      const verifyResponse = await fetch(
        'https://api-m.paypal.com/v1/notifications/verify-webhook-signature',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          body: JSON.stringify({
            transmission_id: transmissionId,
            timestamp: timestamp,
            webhook_id: webhookId,
            event_body: event,
            cert_url: certUrl,
            auth_algo: authAlgo,
            transmission_sig: signature,
          }),
        },
      )

      const verifyData = await verifyResponse.json()
      if (verifyData.verification_status !== 'SUCCESS') {
        logger.error({ message: 'PayPal Webhook Signature Verification Failed', verifyData })
        return res.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Invalid PayPal signature' })
      }
    } catch (err) {
      logger.error({ message: `PayPal Webhook Error: ${err.message}` })
      return res
        .status(HTTP_STATUS.INTERNAL_ERROR || 500)
        .send({ error: 'Webhook verification failed' })
    }
  } else {
    event = req.body
  }

  if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
    const resource = event.resource
    const orderId = resource.custom_id || resource.invoice_id
    if (orderId) {
      await handleOrderSuccess({ _id: orderId })
    }
  } else if (event.event_type === 'PAYMENT.SALE.DENIED') {
    const orderId = event.resource.custom_id || event.resource.invoice_id
    if (orderId) {
      const failedOrder = await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: { $ne: 'failed' } },
        { paymentStatus: 'failed', status: 'cancelled' },
        { new: true },
      )

      if (failedOrder && failedOrder.items) {
        logger.info({ message: `Order ${failedOrder._id} failed and stock restored successfully.` })
      }
    }
  }

  return res.status(HTTP_STATUS.OK).send({ received: true })
})

//////////////////////////////////////////////////////

function verifyPaymobHmac(req) {
  const hmacReceived = req.query.hmac || req.headers['hmac']
  if (!hmacReceived) return false

  const obj = req.body?.obj
  if (!obj) return false

  const concatenatedString =
    String(obj.amount_cents || '') +
    String(obj.created_at || '') +
    String(obj.currency || '') +
    String(obj.error_occured || '') +
    String(obj.has_parent_transaction || '') +
    String(obj.id || '') +
    String(obj.integration_id || '') +
    String(obj.is_3d_secure || '') +
    String(obj.is_auth || '') +
    String(obj.is_capture || '') +
    String(obj.is_refunded || '') +
    String(obj.is_standalone_payment || '') +
    String(obj.is_voided || '') +
    String(obj.order?.id || '') +
    String(obj.owner || '') +
    String(obj.pending || '') +
    String(obj.source_data?.pan || '') +
    String(obj.source_data?.sub_type || '') +
    String(obj.source_data?.type || '') +
    String(obj.success || '')

  const secret = environment.paymob.hmacSecret
  if (!secret) return false

  const calculatedHmac = crypto
    .createHmac('sha512', secret)
    .update(concatenatedString)
    .digest('hex')

  return calculatedHmac === hmacReceived
}

//////////////////////////////////////////////////////

export const handlePaymobWebhook = asyncHandler(async (req, res) => {
  let eventData = req.body
  if (environment.nodeEnv === 'production') {
    const isValid = verifyPaymobHmac(req)
    if (!isValid) {
      logger.error({ message: 'Paymob Webhook HMAC Verification Failed' })
      return res.status(HTTP_STATUS.BAD_REQUEST).send({ error: 'Invalid Paymob HMAC signature' })
    }
  }

  const obj = eventData.obj

  if (obj && obj.success === true) {
    const orderId = obj.order?.merchant_order_id
    if (orderId) {
      await handleOrderSuccess({ _id: orderId })
    }
  } else if (obj && obj.success === false) {
    const orderId = obj.order?.merchant_order_id
    if (orderId) {
      const failedOrder = await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: { $ne: 'failed' } },
        { paymentStatus: 'failed', status: 'cancelled' },
        { new: true },
      )

      if (failedOrder && failedOrder.items) {
        logger.info({ message: `Order ${failedOrder._id} failed and stock restored successfully.` })
      }
    }
  }
  return res.status(HTTP_STATUS.OK).send({ received: true })
})
