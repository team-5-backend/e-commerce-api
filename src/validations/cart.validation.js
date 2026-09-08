import Joi from 'joi'

import objectIdSchema from './schemas/id.schema.js'

export const productIdParamsSchema = Joi.object({
  productId: objectIdSchema.required().messages({
    'any.required': 'Product ID is required',
  }),
})

export const addCartItemSchema = Joi.object({
  productId: objectIdSchema.required().messages({
    'any.required': 'Product ID is required',
  }),
  quantity: Joi.number().integer().min(1).default(1),
})

export const updateCartItemSchema = Joi.object({
  productId: objectIdSchema.required().messages({
    'any.required': 'Product ID is required',
  }),
  quantity: Joi.number().integer().min(1).required(),
})

export const applyCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .valid('SAVE10', 'SAVE20', 'SAVE50', 'SAVE80', 'OFF50')
    .required(),
})
