export class AppError extends Error {
  constructor(message, statusCode, options) {
    super(message, options)
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}
