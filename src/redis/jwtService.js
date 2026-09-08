import jwt from 'jsonwebtoken'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'
import { User } from '../models/user.model.js'
import { AppError } from '../utils/appError.js'
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
export const generateTokens = async (schemaPayload, existingSessionId = null) => {
  const { value, error: schemaError } = generateTokensSchema.validate(schemaPayload)
  if (schemaError)
    throw new AppError(
      `Schema validation failed: ${schemaError.message}`,
      HTTP_STATUS.BAD_REQUEST,
      {
        cause: schemaError,
      },
    )
  const { userId, userRole, ip, userAgent } = value

  const sessionId = existingSessionId || crypto.randomUUID()
  const tokenPayload = { _id: userId, role: userRole, sessionId }

  const accessToken = jwt.sign(tokenPayload, environment.auth.jwtAccessSecret, {
    expiresIn: environment.auth.jwtAccessExp,
  })

  const refreshToken = jwt.sign(tokenPayload, environment.auth.jwtRefreshSecret, {
    expiresIn: environment.auth.jwtRefreshExpDays,
  })

  const ttlInSeconds =
    Number(String(environment.auth.jwtRefreshExpDays).replace('d', '')) * 24 * 60 * 60
  const sessionData = JSON.stringify({ sessionId, userId, userRole, ip, userAgent })

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
  const { value, error: schemaError } = refreshTokensSchema.validate(schemaPayload)
  if (schemaError)
    throw new AppError(
      `Schema validation failed: ${schemaError.message}`,
      HTTP_STATUS.BAD_REQUEST,
      {
        cause: schemaError,
      },
    )
  const { refreshToken, currentIp, currentUserAgent } = value

  const dataString = await redisClient.get(`rt:${refreshToken}`)
  if (!dataString) throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED)

  const parsedData = JSON.parse(dataString)
  const { sessionId, userId, ip: storedIp, userAgent: storedUserAgent } = parsedData

  if (storedIp !== currentIp && storedUserAgent !== currentUserAgent) {
    await revokeRefreshToken(userId, refreshToken)
    throw new AppError(
      'Suspicious activity detected. Please log in again.',
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  if (parsedData.newTokens) {
    return parsedData.newTokens
  }

  try {
    jwt.verify(refreshToken, environment.auth.jwtRefreshSecret)
  } catch (error) {
    await revokeRefreshToken(userId, refreshToken)
    throw new AppError('Invalid refresh token signature', HTTP_STATUS.UNAUTHORIZED, {
      cause: error,
    })
  }

  const user = await User.findById(userId)
  if (!user) throw new AppError('User no longer exists', HTTP_STATUS.UNAUTHORIZED)

  const newTokens = await generateTokens(
    {
      userId,
      userRole: user.role,
      ip: currentIp,
      userAgent: currentUserAgent,
    },
    sessionId,
  )
  parsedData.newTokens = newTokens

  const multi = redisClient.multi()
  multi.setEx(`rt:${refreshToken}`, 30, JSON.stringify(parsedData))
  multi.sRem(`user:${parsedData.userId}:sessions`, refreshToken)
  await multi.exec()

  return newTokens
}

export const revokeRefreshToken = async (userId, refreshToken) => {
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

export const revokeSpecificSession = async (userId, sessionId) => {
  const tokens = await redisClient.sMembers(`user:${userId}:sessions`)
  if (!tokens.length) return

  for (const token of tokens) {
    const decoded = jwt.decode(token)
    if (decoded && decoded.sessionId === sessionId) {
      await revokeRefreshToken(userId, token)
      break
    }
  }
}

export const getAllSessions = async (userId) => {
  const tokens = await redisClient.sMembers(`user:${userId}:sessions`)
  if (!tokens.length) return []

  const tokenKeys = tokens.map((t) => `rt:${t}`)
  const sessionDataStrings = await redisClient.mGet(tokenKeys)

  return sessionDataStrings.filter((data) => data !== null).map((data) => JSON.parse(data))
}
