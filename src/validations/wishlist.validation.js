import joi from 'joi'

export const addToWishlistSchema = joi.object({
  user: joi.string().hex().length(24).required().messages({
    'string.length': 'user must be a valid ObjectId',
  }),
  products: joi.array().items(joi.string().hex().length(24)).required().messages({
    'array.includes': 'Each product must be a valid ObjectId',
  }),
})
