import Joi from 'joi'

import password from './schemas/password.schema'
import { createUserSchema } from './user.validation'

export const generateTokensSchema = Joi.object({
  userId: Joi.string().required().messages({
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

export const emailSchema = Joi.object({
  to: Joi.string().email().required().messages({
    'string.empty': '"to" cannot be empty',
    'string.email': '"to" must be a valid email address',
    'any.required': '"to" is required',
  }),
  subject: Joi.string().trim().required().messages({
    'string.empty': '"subject" cannot be empty',
    'any.required': '"subject" is required',
  }),
  html: Joi.string().trim().required().messages({
    'string.empty': '"html" cannot be empty',
    'any.required': '"html" is required',
  }),
})
