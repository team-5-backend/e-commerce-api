import Joi from 'joi'

export const generateOtpValidate = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
})

export const verifyOtpValidate = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
})
