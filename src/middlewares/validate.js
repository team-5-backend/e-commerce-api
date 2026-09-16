import { HTTP_STATUS } from '../config/constants.js'
import { AppError } from '../utils/appError.js'

const validate = (schema, property = 'body') => {
  return (req, _res, next) => {
    const objectToValidate = req[property]

    const { value, error } = schema.validate(objectToValidate, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessages = error.details.map((err) => err.message)
      const validationError = new AppError(errorMessages.join(', '), HTTP_STATUS.BAD_REQUEST)
      return next(validationError)
    }

    if (property === 'query' || property === 'params') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value).forEach((key) => {
          req[property][key] = value[key]
        })
      }
    } else {
      req[property] = value
    }

    next()
  }
}

export default validate
