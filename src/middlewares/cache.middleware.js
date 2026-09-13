import crypto from 'crypto'

import redisClient from '../redis/redisClient.js'
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

    const userId = req.user?._id ? `:${req.user._id}` : ''
    const key = `cache${userId}:${req.originalUrl}:${bodyHash}`

    try {
      const cachedResponse = await redisClient.get(key)

      if (cachedResponse) {
        const { statusCode, body } = JSON.parse(cachedResponse)
        res.status(statusCode)
        res.set('Content-Type', 'application/json')
        return res.send(body)
      }

      // Intercept res.send
      const originalSend = res.send.bind(res)
      res.send = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let parsedBody = body
          if (typeof body === 'string') {
            try {
              parsedBody = JSON.parse(body)
            } catch {}
          }

          const cacheData = JSON.stringify({
            statusCode: res.statusCode,
            body: parsedBody,
          })

          redisClient
            .setEx(key, durationInSeconds, cacheData)
            .catch((error) => logger.error({ message: 'Redis cache error', error }))
        }

        originalSend(body)
      }

      next()
    } catch (error) {
      logger.error({ message: 'Cache middleware error', error })
      next()
    }
  }

export const clearCache = (pattern) => {
  return (_, res, next) => {
    next()

    res.on('finish', async () => {
      if (res.statusCode >= 400 || typeof pattern !== 'string') return

      try {
        const sanitizedPattern = pattern.replace(/[^a-zA-Z0-9_:/-]/g, '')
        if (!sanitizedPattern) return

        const cachePattern = `cache*:${sanitizedPattern}*`
        let keys = []

        for await (const key of redisClient.scanIterator({
          MATCH: cachePattern,
          COUNT: 100,
        })) {
          keys.push(key)

          if (keys.length >= 100) {
            await redisClient.unlink(keys)
            keys = []
          }
        }

        if (keys.length > 0) {
          await redisClient.unlink(keys)
        }

        logger.info({ message: `Cache cleared for pattern: ${sanitizedPattern}` })
      } catch (error) {
        logger.error({ message: `Failed to clear cache for: ${pattern}`, error })
      }
    })
  }
}
