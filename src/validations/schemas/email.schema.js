import Joi from 'joi'

const emailFieldSchema = Joi.string().email().required().messages({
  'string.email': 'Please provide a valid email address.',
  'any.required': 'Email is required.',
})

export default emailFieldSchema
