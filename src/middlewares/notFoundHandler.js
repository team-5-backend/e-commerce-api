import { HTTP_STATUS } from '../config/constants.js'

const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

export default notFoundHandler
