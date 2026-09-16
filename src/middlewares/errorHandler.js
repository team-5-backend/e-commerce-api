import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import logger from '../utils/logger.js'

////////////////////////////////////////////////

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR

  const isOperational = err.isOperational || false
  const message = environment.isDevelopment || isOperational ? err.message : 'Internal Server Error'
  logger.error({
    message: err.message || 'No message provided',
    statusCode,
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
  })

  res.status(statusCode).send({
    success: false,
    message,
    ...(environment.isDevelopment && { stack: err.stack }),
  })
}

export default errorHandler
