import crypto from 'crypto'

import { HTTP_STATUS } from '../config/constants'
import redisClient from '../redis/redisClient.js'
import { AppError } from '../utils/appError'
import logger from '../utils/logger.js'

// MUST be used after authenticate and authorize if present
export const cache =
  (durationInSeconds = 3600) =>
  async (req, res, next) => {
    if (req.method !== 'GET') return next()

    const bodyHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body || {}))
      .digest('hex')

    const userId = req.user?.id ? `:${req.user.id}` : ''
    const key = `cache${userId}:${req.originalUrl}:${bodyHash}`

    try {
      const cachedResponse = await redisClient.get(key)

      if (cachedResponse) {
        res.set('Content-Type', 'application/json')
        return res.send(cachedResponse)
      }

      // Intercept res.send
      const originalSend = res.send.bind(res)
      res.send = (body) => {
        const cacheData = typeof body === 'object' ? JSON.stringify(body) : body

        redisClient
          .setEx(key, durationInSeconds, cacheData)
          .catch((error) => logger.error({ message: 'Redis cache error', error }))

        originalSend(body)
      }

      next()
    } catch (error) {
      logger.error({ message: 'Cache middleware error', error })
      next()
    }
  }
