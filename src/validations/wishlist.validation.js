import Joi from 'joi'

import objectIdSchema from './schemas/id.schema'

export const addToWishlistSchema = Joi.object({
  productId: objectIdSchema.required(),
})

export const deleteWishlistParamsSchema = Joi.object({
  productId: objectIdSchema.required(),
})
