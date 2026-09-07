import Joi from 'joi'

import passwordSchema from './schemas/password.schema.js'
import phoneSchema from './schemas/phone.schema.js'

export const createUserSchema = Joi.object({
  username: Joi.string().required(),

  email: Joi.string().email().required(),

  password: passwordSchema.required(),

  phone: phoneSchema,
})
