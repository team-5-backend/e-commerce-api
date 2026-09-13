import Joi from 'joi'

import addressSchema from './schemas/address.schema.js'
import objectIdSchema from './schemas/id.schema.js'

export const createOrderSchema = Joi.object({
  shippingAddress: addressSchema.required(),

  paymentMethod: Joi.string().valid('cash', 'stripe', 'paypal', 'paymob').default('cash'),

  customerNote: Joi.string().trim().max(1000),
})

export const orderIdParamsSchema = Joi.object({
  id: objectIdSchema.required(),
})
