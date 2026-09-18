import app from './src/app.js'
import environment from './src/config/environment.js'
import { connectDatabase, disconnectDatabase } from './src/db/db.js'
import { connectRedis, disconnectRedis } from './src/redis/redisClient.js'
import logger from './src/utils/logger.js'

process.on('uncaughtException', (error) => {
  logger.error({ message: 'UNCAUGHT EXCEPTION! Shutting down...', error })
  process.exit(1)
})

try {
  await connectDatabase()
  await connectRedis()
} catch (error) {
  logger.error({ message: 'Failed to connect to database or redis', error })
  process.exit(1)
}

const PORT = environment.port || process.env.PORT || 3000

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use.`)
    process.exit(1)
  } else {
    throw error
  }
})

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`)
  server.close(async () => {
    try {
      await disconnectDatabase()
      await disconnectRedis()
      logger.info('Connections closed successfully.')
      process.exit(0)
    } catch (error) {
      logger.error({ message: 'Error during shutdown', error })
      process.exit(1)
    }
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))