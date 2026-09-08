import Joi from 'joi'

const otpFieldSchema = Joi.string()
  .length(6)
  .pattern(/^[0-9]+$/)
  .required()
  .messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain numbers only',
    'any.required': 'OTP is required',
  })

export default otpFieldSchema
