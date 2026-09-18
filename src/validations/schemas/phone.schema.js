import Joi from 'joi'
import { isValidPhoneNumber } from 'libphonenumber-js/min'

const phoneValidator = (value, helpers) => {
  if (typeof value !== 'string') {
    return helpers.error('any.invalid')
  }

  const cleanValue = value.trim()

  const egyptianLocalRegex = /^01[0125]\d{8}$/
  const egyptianInternationalRegex = /^\+201[0125]\d{8}$/

  if (cleanValue.startsWith('01') || cleanValue.startsWith('+20')) {
    if (egyptianLocalRegex.test(cleanValue) || egyptianInternationalRegex.test(cleanValue)) {
      return cleanValue
    }
    return helpers.error('any.invalid')
  }

  if (!isValidPhoneNumber(cleanValue)) {
    return helpers.error('any.invalid')
  }

  return cleanValue
}

const phoneSchema = Joi.string()
  .trim()
  .required()
  .custom(phoneValidator, 'Strict Egyptian & International Phone Validation')
  .messages({
    'any.invalid':
      'The "phone" field must be a valid Egyptian number (11 digits locally or 12 internationally) or a valid international number.',
  })

export default phoneSchema
