import Joi from 'joi'

import password from './schemas/password.schema'
import phone from './schemas/phone.schema'

export const createUserSchema = Joi.object({
  username: Joi.string().required(),

  email: Joi.string().email().required(),

  password: password.required(),

  phone: phone,
})
