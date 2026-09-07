import Joi from 'joi'
import mongoose from 'mongoose'

const objectId = Joi.any()
  .custom((value, helpers) => {
    if (mongoose.Types.ObjectId.isValid(value)) {
      return value.toString()
    }
    return helpers.error('any.invalid')
  })
  .messages({
    'any.invalid': 'Invalid ID format',
  })

export default objectId
