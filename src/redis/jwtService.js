import jwt from 'jsonwebtoken'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import AppError from '../utils/appError.js'
import { generateTokensSchema, refreshTokensSchema } from '../validations/jwt.validation.js'

import redisClient from './redisClient.js'

export const generateTokens = async (userId, userRole, ip, userAgent) => {
  const { error } = generateTokensSchema.validate({
    userId,
    userRole,
    ip,
    userAgent,
  })
  if (error) throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST)

  const accessToken = jwt.sign({ _id: userId, role: userRole }, environment.jwtAccessSecret, {
    expiresIn: environment.jwtAccessExp,
  })

  const refreshToken = jwt.sign({ _id: userId, role: userRole }, environment.jwtRefreshSecret, {
    expiresIn: `${environment.jwtRefreshExpDays}d`,
  })

  const ttlInSeconds = environment.jwtRefreshExpDays * 24 * 60 * 60
  const sessionData = JSON.stringify({ userId, userRole, ip, userAgent })

  const multi = redisClient.multi()
  multi.setEx(`rt:${refreshToken}`, ttlInSeconds, sessionData)
  multi.sAdd(`user:${userId}:sessions`, refreshToken)
  multi.expire(`user:${userId}:sessions`, ttlInSeconds)
  await multi.exec()

  return { accessToken, refreshToken }
}

export const refreshTokens = async (incomingRefreshToken, currentIp, currentUserAgent) => {
  const { error } = refreshTokensSchema.validate({
    incomingRefreshToken,
    currentIp,
    currentUserAgent,
  })
  if (error) throw new AppError(error.message, HTTP_STATUS.BAD_REQUEST)

  const dataString = await redisClient.get(`rt:${incomingRefreshToken}`)
  if (!dataString) {
    throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED)
  }

  const parsedData = JSON.parse(dataString)
  const { userId, userRole, ip: storedIp, userAgent: storedUserAgent } = parsedData

  if (storedIp !== currentIp || storedUserAgent !== currentUserAgent) {
    await revokeRefreshToken(incomingRefreshToken, userId)
    throw new AppError(
      'Suspicious activity detected. Please log in again.',
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  if (parsedData.newTokens) {
    return parsedData.newTokens
  }

  try {
    jwt.verify(incomingRefreshToken, environment.jwtRefreshSecret)
  } catch (error) {
    await revokeRefreshToken(incomingRefreshToken, userId)
    throw new AppError('Invalid refresh token signature', HTTP_STATUS.UNAUTHORIZED)
  }

  const newTokens = await generateTokens(userId, userRole, storedIp, storedUserAgent)
  parsedData.newTokens = newTokens

  const multi = redisClient.multi()
  multi.setEx(`rt:${incomingRefreshToken}`, 30, JSON.stringify(parsedData))
  multi.sRem(`user:${parsedData.userId}:sessions`, incomingRefreshToken)
  await multi.exec()

  return newTokens
}

export const revokeRefreshToken = async (refreshToken, userId) => {
  const multi = redisClient.multi()
  multi.del(`rt:${refreshToken}`)
  if (userId) multi.sRem(`user:${userId}:sessions`, refreshToken)
  await multi.exec()
}

export const revokeUserSessions = async (userId) => {
  const tokens = await redisClient.sMembers(`user:${userId}:sessions`)
  if (!tokens.length) return

  const multi = redisClient.multi()
  tokens.forEach((token) => multi.del(`rt:${token}`))
  multi.del(`user:${userId}:sessions`)
  await multi.exec()
}
