import Joi from 'joi'

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
