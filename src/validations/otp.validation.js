import Joi from 'joi'

import password from './schemas/password.schema'
import { createUserSchema } from './user.validation'

export const createOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain numbers only',
      'any.required': 'OTP is required',
    }),
  attempts: Joi.number().default(5),
  userData: createUserSchema.optional().allow(null),
  newPassword: password.optional().allow(null),
})

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
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
