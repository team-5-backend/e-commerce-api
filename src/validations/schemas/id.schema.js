import Joi from 'joi'

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Invalid Product ID format',
  'string.length': 'Product ID must be 24 characters',
  'any.required': 'Product ID is required',
})

export default objectId
