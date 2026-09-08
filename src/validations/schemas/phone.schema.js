import Joi from 'joi'
import { isValidPhoneNumber } from 'libphonenumber-js/min'

const phoneValidator = (value, helpers) => {
  if (!isValidPhoneNumber(value)) {
    return helpers.error('any.invalid')
  }
  return value
}

const phoneSchema = Joi.string()
  .required()
  .custom(phoneValidator, 'International Phone Validation')
  .messages({
    'any.invalid':
      'The "phone" field must be a valid international phone number including country code.',
  })

export default phoneSchema
