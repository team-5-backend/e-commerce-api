import Joi from 'joi'

import emailFieldSchema from './schemas/email.schema.js'
import otpFieldSchema from './schemas/otp.schema.js'
import passwordSchema from './schemas/password.schema.js'
import { createUserSchema } from './user.validation.js'

//////////////////////////////////////////////////////

export const loginSchema = Joi.object({
  email: emailFieldSchema,
  password: passwordSchema,
})

//////////////////////////////////////////////////////

export const verifyOtpSchema = Joi.object({
  email: emailFieldSchema,
  otp: otpFieldSchema,
})

//////////////////////////////////////////////////////

export const createOtpSchema = verifyOtpSchema.keys({
  attempts: Joi.number().default(5),
  userData: createUserSchema.allow(null),
})

//////////////////////////////////////////////////////

export const registerSchema = createUserSchema

//////////////////////////////////////////////////////

export const verifyRegisterOtpSchema = verifyOtpSchema

//////////////////////////////////////////////////////

export const forgotPasswordSchema = Joi.object({
  email: emailFieldSchema,
}).unknown(false)

//////////////////////////////////////////////////////

export const verifyForgotPasswordOtpSchema = verifyOtpSchema.keys({
  newPassword: passwordSchema,
})

//////////////////////////////////////////////////////

export const deleteSessionParamsSchema = Joi.object({
  sessionId: Joi.string().trim().guid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Session ID must be a valid UUID.',
    'any.required': 'Session ID is required.',
  }),
})

//////////////////////////////////////////////////////

export const generateTokenSchema = Joi.object({
  userId: Joi.string().trim(),
  userRole: Joi.string().trim().required(),
  ip: Joi.string().trim().allow(null, '').optional(),
  userAgent: Joi.string().trim().allow(null, '').optional(),
})

//////////////////////////////////////////////////////

export const refreshTokenSchema = Joi.object({
  incomingRefreshToken: Joi.string().trim().required(),
  currentIp: Joi.string().trim().allow(null, ''),
  currentUserAgent: Joi.string().trim().allow(null, ''),
})
