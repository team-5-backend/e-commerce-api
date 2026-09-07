import { HTTP_STATUS } from '../config/constants.js'
import { AppError } from '../utils/appError.js'

const validateQuery = (schema) => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessages = error.details.map((err) => err.message)

      const validationError = new AppError(
        errorMessages.join(', '),
        HTTP_STATUS.BAD_REQUEST,
      )

      return next(validationError)
    }

    req.query = value
    next()
  }
}

export default validateQuery