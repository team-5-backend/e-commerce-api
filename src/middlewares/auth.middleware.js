import jwt from 'jsonwebtoken'

import { COOKIE_OPTIONS, HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import { refreshTokens } from '../redis/jwtService.js'
import redisClient from '../redis/redisClient.js'
import { AppError } from '../utils/appError.js'

//////////////////////////////////////////////

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  let accessToken = null

  if (authHeader) {
    const parts = authHeader.split(/\s+/)
    if (parts.length >= 2 && parts[0].toLowerCase() === 'bearer') {
      accessToken = parts[1]
    }
  }

  const { refreshToken } = req.cookies || {}

  if (!refreshToken && !accessToken)
    return next(new AppError('Not authenticated. Please log in.', HTTP_STATUS.UNAUTHORIZED))

  try {
    req.user = jwt.verify(accessToken, environment.auth.jwtAccessSecret)
    const tokens = await redisClient.sMembers(`user:${req.user._id}:sessions`)
    let isSessionValid = false

    for (const token of tokens) {
      const decodedRefresh = jwt.decode(token)
      if (decodedRefresh && decodedRefresh.sessionId === req.user.sessionId) {
        isSessionValid = true
        break
      }
    }

    if (!isSessionValid) {
      return next(
        new AppError('Session expired or revoked. Please log in again.', HTTP_STATUS.UNAUTHORIZED),
      )
    }

    return next()
  } catch (accessTokenError) {
    if (!refreshToken)
      return next(
        new AppError('Not authenticated. Please log in.', HTTP_STATUS.UNAUTHORIZED, {
          cause: accessTokenError,
        }),
      )

    try {
      const currentIp = req.ip
      const currentUserAgent = req.headers['user-agent']

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshTokens({
        incomingRefreshToken: refreshToken,
        currentIp,
        currentUserAgent,
      })

      res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)

      res.setHeader('x-access-token', newAccessToken)

      req.user = jwt.verify(newAccessToken, environment.auth.jwtAccessSecret)

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

//////////////////////////////////////////////

export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!allowedRoles.includes(req.user.role))
      return next(
        new AppError('You do not have permission to perform this action.', HTTP_STATUS.FORBIDDEN),
      )

    next()
  }
}
