import Joi from 'joi'

import objectIdSchema from './schemas/id.schema.js'

export const addToWishlistSchema = Joi.object({
  products: Joi.array().items(objectIdSchema).min(1).required().messages({
    'array.base': 'Products must be an array of IDs',
    'array.min': 'Products array must contain at least 1 product',
    'any.required': 'Products array is required',
  }),
})

export const wishlistActionSchema = Joi.object({
  productId: objectIdSchema.required().messages({
    'any.required': 'Product ID is required',
  }),
})
