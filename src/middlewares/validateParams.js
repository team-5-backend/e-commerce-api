import { HTTP_STATUS } from '../config/constants.js'
import { AppError } from '../utils/appError.js'

const validateParams = (schema) => {
  return (req, _res, next) => {
    const { value, error: schemaError } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (schemaError) {
      const errorMessages = schemaError.details.map((err) => err.message)
      const validationError = new AppError(errorMessages.join(', '), HTTP_STATUS.BAD_REQUEST)
      return next(validationError)
    }

    req.params = value
    next()
  }
}

export default validateParams
