import { createClient } from 'redis'

import environment from '../config/environment.js'

const redisClient = createClient({ url: environment.redisUrl })
redis.on('error', (err) => console.error('Redis Error:', err))
await redis.connect()

export default redisClient
