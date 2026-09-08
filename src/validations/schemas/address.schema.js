import Joi from 'joi'

import phoneSchema from './phone.schema'

const addressSchema = Joi.object({
  fullName: Joi.string().trim().required(),
  phone: phoneSchema.required(),
  country: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  postalCode: Joi.string().trim().required(),
})

export default addressSchema
