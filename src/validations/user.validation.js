import Joi from 'joi'

import emailFieldSchema from './schemas/email.schema.js'
import passwordSchema from './schemas/password.schema.js'
import phoneSchema from './schemas/phone.schema.js'

export const createUserSchema = Joi.object({
  username: Joi.string().required(),

  email: emailFieldSchema,

  password: passwordSchema,

  phone: phoneSchema,
})
