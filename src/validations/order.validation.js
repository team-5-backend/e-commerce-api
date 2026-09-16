import Joi from 'joi'

import addressSchema from './schemas/address.schema.js'

export const createOrderSchema = Joi.object({
  shippingAddress: addressSchema.required(),
  paymentMethod: Joi.string().trim().valid('cash', 'stripe', 'paypal', 'paymob').default('cash'),
})
