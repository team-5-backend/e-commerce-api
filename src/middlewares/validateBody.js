import { AppError } from '../utils/appError.js'

const validateBody = (schema) => {
  return (req, _res, next) => {
    const { value, error: schemaError } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (schemaError) {
      const errorMessages = schemaError.details.map((err) => err.message)

      const validationError = new AppError(errorMessages.join(', '), HTTP_STATUS.BAD_REQUEST)
      return next(validationError)
    }

    req.body = value
    next()
  }
}

export default validateBody
