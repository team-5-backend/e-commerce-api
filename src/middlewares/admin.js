import { HTTP_STATUS } from '../config/constants.js'
import { AppError } from '../utils/appError.js'

const admin = (req, _res, next) => {
  const { userRole } = req.body

  if (userRole !== 'admin') {
    const error = new AppError('Unauthorized: Admin access required', HTTP_STATUS.UNAUTHORIZED)
    return next(error)
  }

  next()
}

export default admin
