import Joi from 'joi'

import addressSchema from './schemas/address.schema.js'

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required().trim(),
        image: Joi.string().trim().required(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),

  shippingAddress: addressSchema.required(),

  paymentMethod: Joi.string().valid('cash', 'stripe', 'paypal', 'paymob').default('cash'),

  customerNote: Joi.string().trim().max(1000),
})
