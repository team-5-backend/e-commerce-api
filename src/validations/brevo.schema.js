import Joi from 'joi'

import emailFieldSchema from './schemas/email.schema'

export const emailSchema = Joi.object({
  to: emailFieldSchema,
  subject: Joi.string().trim().required().messages({
    'string.empty': '"subject" cannot be empty',
    'any.required': '"subject" is required',
  }),
  html: Joi.string().trim().required().messages({
    'string.empty': '"html" cannot be empty',
    'any.required': '"html" is required',
  }),
})
