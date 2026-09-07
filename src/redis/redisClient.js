import { createClient } from 'redis'

import environment from '../config/environment.js'
import logger from '../utils/logger.js'

const redisClient = createClient({
  url: environment.redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) return new Error('Redis max retries reached')
      return Math.min(retries * 100, 3000)
    },
  },
})

redisClient.on('error', (error) => {
  if (!error || !error.message || error.code === 'ECONNREFUSED') {
    return
  }

  logger.error({ message: 'Redis connection error', error })
})

redisClient.on('connect', () => {
  logger.info('Redis connected successfully')
})

redisClient.on('end', () => {
  logger.warn('Redis connection lost. Client will attempt to auto-reconnect...')
})

export const connectRedis = async () => {
  if (redisClient.isOpen) {
    return
  }

  try {
    await redisClient.connect()
  } catch (error) {
    logger.error({ message: 'Redis connection failed', error })
    process.exit(1)
  }
}

export const disconnectRedis = async () => {
  if (!redisClient.isOpen) {
    return
  }

  try {
    await redisClient.quit()
    logger.info('Redis disconnected gracefully.')
  } catch (error) {
    logger.error({ message: 'Redis disconnection error', error })
  }
}

export default redisClient
