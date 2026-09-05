import mongoose from 'mongoose'

import environment from '../config/environment.js'
import logger from '../utils/logger.js'

mongoose.connection.on('error', (error) => {
  logger.error({ message: 'MongoDB connection error:', error })
})

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Mongoose will attempt to auto-reconnect...')
})

export const connectDatabase = async () => {
  if (mongoose.connection.readyState >= 1) {
    return
  }

  try {
    const conn = await mongoose.connect(environment.mongoUri)
    logger.info(`MongoDB connected successfully: ${conn.connection.host}`)
  } catch (error) {
    logger.error({ message: 'MongoDB connection failed:', error })
    process.exit(1)
  }
}

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return
  }

  try {
    await mongoose.disconnect()
    logger.info('MongoDB disconnected gracefully.')
  } catch (error) {
    logger.error({ message: 'MongoDB disconnection error:', error })
  }
}
