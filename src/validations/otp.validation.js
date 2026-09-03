import Joi from 'joi'

export const generateOtpValidate = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
})

export const verifyOtpValidate = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain numbers only',
      'any.required': 'OTP is required',
    }),
})
