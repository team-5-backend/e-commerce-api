import dotenv from 'dotenv'

import app from './app.js'
import { connectDatabase } from './config/database.js'
import environment from './config/environment.js'
import logger from './utils/logger.js'

dotenv.config()

await connectDatabase()

const server = app.listen(environment.port, () => {
  logger.info(`🚀 Server running at http://${environment.host}:${environment.port}`)
})

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`)
  server.close(() => {
    logger.info('Server closed.')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
