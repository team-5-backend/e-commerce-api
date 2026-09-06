import jwt from 'jsonwebtoken'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import AppError from '../utils/appError.js'
import { generateTokensSchema, refreshTokensSchema } from '../validations/auth.validation.js'

import redisClient from './redisClient.js'

export const cleanUpDeadSessions = async (userId) => {
  const tokens = await redisClient.sMembers(`user:${userId}:sessions`)
  if (!tokens.length) return

  const tokenKeys = tokens.map((t) => `rt:${t}`)
  const activeTokens = await redisClient.mGet(tokenKeys)

  const multi = redisClient.multi()
  tokens.forEach((token, index) => {
    if (!activeTokens[index]) multi.sRem(`user:${userId}:sessions`, token)
  })
  await multi.exec()
}

// takes { userId, userRole, ip, userAgent }
export const generateTokens = async (schemaPayload) => {
  const { value, error } = generateTokensSchema.validate(schemaPayload)
  if (error)
    throw new AppError(`Schema validation failed: ${error.message}`, HTTP_STATUS.BAD_REQUEST, {
      cause: error,
    })
  const { userId, userRole, ip, userAgent } = value

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

  await cleanUpDeadSessions(userId)

  return { accessToken, refreshToken }
}

// takes { refreshToken, currentIp, currentUserAgent }
export const refreshTokens = async (schemaPayload) => {
  const { value, error } = refreshTokensSchema.validate(schemaPayload)
  if (error)
    throw new AppError(`Schema validation failed: ${error.message}`, HTTP_STATUS.BAD_REQUESTc)
  const { refreshToken, currentIp, currentUserAgent } = value

  const dataString = await redisClient.get(`rt:${refreshToken}`)
  if (!dataString) throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED)

  const parsedData = JSON.parse(dataString)
  const { userId, userRole, ip: storedIp, userAgent: storedUserAgent } = parsedData

  if (storedIp !== currentIp && storedUserAgent !== currentUserAgent) {
    await revokeRefreshToken(refreshToken, userId)
    throw new AppError(
      'Suspicious activity detected. Please log in again.',
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  if (parsedData.newTokens) {
    return parsedData.newTokens
  }

  try {
    jwt.verify(refreshToken, environment.jwtRefreshSecret)
  } catch (error) {
    await revokeRefreshToken(refreshToken, userId)
    throw new AppError('Invalid refresh token signature', HTTP_STATUS.UNAUTHORIZED, {
      cause: error,
    })
  }

  const newTokens = await generateTokens({
    userId,
    userRole,
    ip: currentIp,
    userAgent: currentUserAgent,
  })
  parsedData.newTokens = newTokens

  const multi = redisClient.multi()
  multi.setEx(`rt:${refreshToken}`, 30, JSON.stringify(parsedData))
  multi.sRem(`user:${parsedData.userId}:sessions`, refreshToken)
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

export const getAllSessions = async (userId) => {
  const tokens = await redisClient.sMembers(`user:${userId}:sessions`)
  if (!tokens.length) return []

  const tokenKeys = tokens.map((t) => `rt:${t}`)
  const sessionDataStrings = await redisClient.mGet(tokenKeys)

  return sessionDataStrings.filter((data) => data !== null).map((data) => JSON.parse(data))
}
