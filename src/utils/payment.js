import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk'
import { Stripe } from 'stripe'

import environment from '../config/environment.js'
import { AppError } from '../utils/AppError.js'
import { HTTP_STATUS } from '../utils/httpStatus.js'

const stripe = new Stripe(environment.stripe.secretKey)

const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: environment.paypal.clientId,
    oAuthClientSecret: environment.paypal.clientSecret,
  },
  timeout: 0,
  environment: Environment.Sandbox,
})
const paypalOrdersController = new OrdersController(paypalClient)

export const processStripePayment = async (order) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency: 'egp',
    metadata: { orderId: order._id.toString() },
  })

  return {
    clientSecret: paymentIntent.client_secret,
    transactionId: paymentIntent.id,
  }
}

export const processPaypalPayment = async (order) => {
  try {
    const { body, statusCode } = await paypalOrdersController.ordersCreate({
      body: {
        intent: 'CAPTURE',
        purchaseUnits: [
          {
            referenceId: order._id.toString(),
            amount: {
              currencyCode: 'USD',
              value: order.totalPrice.toFixed(2),
            },
          },
        ],
        applicationContext: {
          returnUrl: `${environment.allowedOrigins}/payment/success`,
          cancelUrl: `${environment.allowedOrigins}/payment/cancel`,
        },
      },
    })

    if (statusCode !== 201 && statusCode !== 200) {
      throw new AppError('PayPal returned non-success status', HTTP_STATUS.INTERNAL_ERROR)
    }

    const parsedBody = typeof body === 'string' ? JSON.parse(body) : body
    const approvalUrl = parsedBody.links?.find((link) => link.rel === 'approve')?.href

    if (!approvalUrl) {
      throw new AppError('PayPal approval URL not found', HTTP_STATUS.INTERNAL_ERROR)
    }

    return {
      paypalApprovalUrl: approvalUrl,
      transactionId: parsedBody.id,
    }
  } catch (error) {
    throw new AppError(`PayPal Error: ${error.message}`, HTTP_STATUS.INTERNAL_ERROR)
  }
}

export const processPaymobPayment = async (order, user) => {
  const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: environment.paymob.apiKey }),
  })

  if (!authRes.ok) throw new AppError('Paymob auth failed.', HTTP_STATUS.INTERNAL_ERROR)

  const { token } = await authRes.json()
  const amountCents = Math.round(order.totalPrice * 100)

  const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: 'false',
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: order._id.toString(),
      items: [],
    }),
  })

  if (!orderRes.ok)
    throw new AppError('Paymob order registration failed', HTTP_STATUS.INTERNAL_ERROR)

  const orderData = await orderRes.json()

  const paymentKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderData.id,
      billing_data: {
        apartment: 'NA',
        email: user.email || 'test@test.com',
        floor: 'NA',
        first_name: user.username || 'Customer',
        street: 'NA',
        building: 'NA',
        phone_number: user.phone || '01000000000',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EGY',
        last_name: 'NA',
        state: 'NA',
      },
      currency: 'EGP',
      integration_id: Number(environment.paymob.id),
    }),
  })

  if (!paymentKeyRes.ok)
    throw new AppError('Paymob payment key generation failed', HTTP_STATUS.INTERNAL_ERROR)

  const paymentKeyData = await paymentKeyRes.json()

  return {
    paymobPaymentToken: paymentKeyData.token,
    transactionId: orderData.id.toString(),
  }
}
