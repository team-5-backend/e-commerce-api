import Joi from 'joi'

import emailFieldSchema from './schemas/email.schema.js'
import objectIdSchema from './schemas/id.schema.js'
import otpFieldSchema from './schemas/otp.schema.js'
import { createUserSchema } from './user.validation.js'

////////////////////////////////////////////////////////////////////////

export const loginSchema = Joi.object({
  email: emailFieldSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required.',
  }),
})

////////////////////////////////////////////////////////////////////////

export const verifyOtpSchema = Joi.object({
  email: emailFieldSchema,
  otp: otpFieldSchema,
})

////////////////////////////////////////////////////////////////////////

export const createOtpSchema = verifyOtpSchema.keys({
  attempts: Joi.number().default(5),
  userData: createUserSchema.allow(null),
})

////////////////////////////////////////////////////////////////////////

export const registerSchema = createUserSchema

////////////////////////////////////////////////////////////////////////

export const verifyRegisterOtpSchema = verifyOtpSchema

////////////////////////////////////////////////////////////////////////

export const forgotPasswordSchema = Joi.object({
  email: emailFieldSchema,
})

////////////////////////////////////////////////////////////////////////

export const verifyForgotPasswordOtpSchema = verifyOtpSchema.keys({
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'New password must be at least 8 characters long.',
    'any.required': 'New password is required.',
  }),
})

////////////////////////////////////////////////////////////////////////

export const deleteSessionParamsSchema = Joi.object({
  sessionId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Session ID must be a valid UUID.',
    'any.required': 'Session ID is required.',
  }),
})

////////////////////////////////////////////////////////////////////////

export const generateTokenSchema = Joi.object({
  userId: objectIdSchema.required().messages({
    'any.required': 'User ID is required',
  }),
  userRole: Joi.string().required(),
  ip: Joi.string().allow(null, '').optional(),
  userAgent: Joi.string().allow(null, '').optional(),
})

////////////////////////////////////////////////////////////////////////

export const refreshTokenSchema = Joi.object({
  incomingRefreshToken: Joi.string().required(),
  currentIp: Joi.string().allow(null, '').optional(),
  currentUserAgent: Joi.string().allow(null, '').optional(),
})
