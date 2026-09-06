import { createClient } from 'redis'

import environment from '../config/environment.js'
import logger from '../utils/logger.js'

const redisClient = createClient({ url: environment.redisUrl })
redis.on('error', (error) => logger.error({ message: 'Redis Error:', error }))
await redis.connect()

export default redisClient
