import Joi from 'joi'

import objectIdSchema from './schemas/id.schema.js'

export const addCartItemSchema = Joi.object({
  productId: objectIdSchema.required(),
  quantity: Joi.number().integer().min(1).default(1),
})

export const applyCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .valid('SAVE10', 'SAVE20', 'SAVE50', 'SAVE80', 'OFF50')
    .required(),
})
