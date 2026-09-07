import { createClient } from 'redis'

import environment from '../config/environment.js'
import logger from '../utils/logger.js'

const redisClient = createClient({ url: environment.redisUrl })

redisClient.on('error', (error) => logger.error({ message: 'Redis error', error }))

redisClient.on('connect', () => {
  logger.info('Connected to Redis successfully')
})

redisClient.on('ready', () => {
  logger.info('Redis client is ready to use')
})

await redisClient.connect()

export default redisClient
