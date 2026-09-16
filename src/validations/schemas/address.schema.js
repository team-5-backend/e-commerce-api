import Joi from 'joi'

const addressSchema = Joi.object({
  country: Joi.string().trim().required(),
  city: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  postalCode: Joi.string().trim().required(),
})

export default addressSchema
