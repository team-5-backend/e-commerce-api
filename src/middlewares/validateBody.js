const validateBody = (schema) => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errorMessages = error.details.map((err) => err.message)

      const validationError = new Error(errorMessages.join(', '))
      validationError.statusCode = HTTP_STATUS.BAD_REQUEST

      return next(validationError)
    }

    req.body = value
    next()
  }
}

export default validateBody
