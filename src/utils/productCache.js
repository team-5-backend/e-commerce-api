import redisClient from '../redis/redisClient.js'
import logger from './logger.js'

const PRODUCT_CACHE_PATTERN = 'cache*:/api/v1/products*'

export const clearProductCache = async () => {
  try {
    const keys = []

    for await (const key of redisClient.scanIterator({
      MATCH: PRODUCT_CACHE_PATTERN,
      COUNT: 100,
    })) {
      keys.push(key)
    }

    if (keys.length > 0) {
      await redisClient.del(keys)
    }
  } catch (error) {
    logger.error({
      message: 'Failed to clear product cache',
      error,
    })
  }
}