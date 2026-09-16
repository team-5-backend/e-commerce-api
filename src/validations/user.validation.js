import Joi from 'joi'

import addressSchema from './schemas/address.schema.js'
import emailFieldSchema from './schemas/email.schema.js'
import passwordSchema from './schemas/password.schema.js'
import phoneSchema from './schemas/phone.schema.js'

//////////////////////////////////////////////////////

export const createUserSchema = Joi.object({
  username: Joi.string().trim().required(),

  email: emailFieldSchema,

  password: passwordSchema,

  phone: phoneSchema,
  role: Joi.string().trim().valid('admin', 'customer').default('customer'),
  addresses: addressSchema,
  isVerified: Joi.boolean().default('false'),
})

//////////////////////////////////////////////////////

export const updateUserSchema = createUserSchema.fork(
  ['username', 'email', 'password', 'phone', 'addresses'],
  (schema) => schema.optional(),
)
