import dotenv from 'dotenv'

import app from './src/app.js'
import environment from './src/config/environment.js'
import { connectDatabase } from './src/db/db.js'
import logger from './src/utils/logger.js'

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
