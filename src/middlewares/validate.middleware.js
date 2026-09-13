import { HTTP_STATUS } from '../config/constants.js'
import { AppError } from '../utils/appError.js'

const validate = (schema, property = 'body') => {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessages = error.details.map((err) => err.message)
      const validationError = new AppError(errorMessages.join(', '), HTTP_STATUS.BAD_REQUEST)
      return next(validationError)
    }

    req[property] = value
    next()
  }
}

export default validate
