import dotenv from 'dotenv'

import app from './src/app.js'
import environment from './src/config/environment.js'
import { connectDatabase, disconnectDatabase } from './src/db/db.js'
import logger from './src/utils/logger.js'

dotenv.config()

await connectDatabase()

const server = app.listen(environment.port, () => {
  logger.info(`🚀 Server running at http://${environment.host}:${environment.port}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(
      `Port ${environment.port} is already in use. Please wait a moment for the OS to release it.`,
    )
    process.exit(1)
  } else {
    throw error
  }
})

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`)

  const forceShutdown = setTimeout(() => {
    logger.error('Could not close connections in time, forcing shutdown')
    process.exit(1)
  }, 3000)

  server.close(async () => {
    try {
      clearTimeout(forceShutdown)
      await disconnectDatabase()
      logger.info('Server and database connections closed successfully.')
      process.exit(0)
    } catch (error) {
      logger.error({ message: 'Error during shutdown:', error })
      process.exit(1)
    }
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGUSR2', () => shutdown('SIGUSR2'))
