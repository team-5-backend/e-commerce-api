import jwt from 'jsonwebtoken'

import { COOKIE_OPTIONS, HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import { refreshTokens } from '../redis/jwtService.js'
import AppError from '../utils/appError.js'

export const authenticate = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies || {}

  if (!refreshToken && !accessToken) {
    return next(new AppError('Not authenticated. Please log in.', HTTP_STATUS.UNAUTHORIZED))
  }

  try {
    req.user = jwt.verify(accessToken, environment.jwtAccessSecret)
    return next()
  } catch (error) {
    if (!refreshToken) {
      return next(
        new AppError('Not authenticated. Please log in.', HTTP_STATUS.UNAUTHORIZED, {
          cause: error,
        }),
      )
    }

    try {
      const currentIp = req.ip
      const currentUserAgent = req.headers['user-agent']

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshTokens(
        refreshToken,
        currentIp,
        currentUserAgent,
      )

      res.cookie('accessToken', newAccessToken, COOKIE_OPTIONS)
      res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)

      req.user = jwt.verify(newAccessToken, environment.jwtAccessSecret)

      return next()
    } catch (error) {
      return next(
        new AppError('Invalid token. Please log in.', HTTP_STATUS.UNAUTHORIZED, {
          cause: error,
        }),
      )
    }
  }
}

// Role-based Authorization (Use AFTER authenticate)
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', HTTP_STATUS.FORBIDDEN),
      )
    }
    next()
  }
}
