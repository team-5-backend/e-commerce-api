import Joi from 'joi'

import objectIdSchema from './schemas/id.schema.js'
import { createUserSchema } from './user.validation.js'

export const generateTokensSchema = Joi.object({
  userId: objectIdSchema.required().messages({
    'any.required': 'User ID is required',
  }),
  userRole: Joi.string().required(),
  ip: Joi.string().allow(null, '').optional(),
  userAgent: Joi.string().allow(null, '').optional(),
})

export const refreshTokensSchema = Joi.object({
  incomingRefreshToken: Joi.string().required(),
  currentIp: Joi.string().allow(null, '').optional(),
  currentUserAgent: Joi.string().allow(null, '').optional(),
})

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
  userData: createUserSchema.allow(null),
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
