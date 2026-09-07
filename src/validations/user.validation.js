import Joi from 'joi'

import password from './schemas/password.schema.js'
import phone from './schemas/phone.schema.js'

export const createUserSchema = Joi.object({
  username: Joi.string().required(),

  email: Joi.string().email().required(),

  password: password.required(),

  phone: phone,
})
