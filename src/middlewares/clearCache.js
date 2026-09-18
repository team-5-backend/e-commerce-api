import redisClient from '../redis/redisClient.js'
import logger from '../utils/logger.js'

//////////////////////////////////////////////////////

export const clearCache = (pattern) => {
  return async (_, res, next) => {
    next()

    res.on('finish', async () => {
      if (res.statusCode >= 400) {
        return
      }

      try {
        const sanitizedPattern =
          typeof pattern === 'string' ? pattern.replace(/[^a-zA-Z0-9_-]/g, '') : ''

        if (!sanitizedPattern) return

        const cachePattern = `cache*:${sanitizedPattern}*`
        const keys = []

        for await (const key of redisClient.scanIterator({
          MATCH: cachePattern,
          COUNT: 100,
        })) {
          keys.push(key)
        }

        if (keys.length > 0) {
          await redisClient.del(keys)
          logger.info({
            message: `Cache cleared successfully for pattern: ${sanitizedPattern}`,
            count: keys.length,
          })
        }
      } catch (error) {
        logger.error({
          message: `Failed to clear cache for pattern: ${pattern}`,
          error,
        })
      }
    })
  }
}
