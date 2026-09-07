import Joi from 'joi'

import phone from './phone.schema'

const address = Joi.object({
  fullName: Joi.string().trim().required(),
  phone: phone.required(),
  country: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  postalCode: Joi.string().trim().required(),
})

export default address
