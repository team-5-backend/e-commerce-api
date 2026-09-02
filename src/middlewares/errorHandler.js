import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import logger from '../utils/logger.js'

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR
  const message = err.message || 'Internal Server Error'

  logger.error({
    message,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
  })

  res.status(statusCode).json({
    success: false,
    message,
    ...(environment.isDevelopment && { stack: err.stack }),
  })
}

export default errorHandler
