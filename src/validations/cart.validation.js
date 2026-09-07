import Joi from 'joi'

import objectId from './schemas/id.schema'

export const addCartItemSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1),
})

export const applyCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .valid('SAVE10', 'SAVE20', 'SAVE50', 'SAVE80', 'OFF50')
    .required(),
})
