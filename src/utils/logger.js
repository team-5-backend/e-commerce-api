import pino from 'pino'

import { HTTP_STATUS } from '../config/constants.js'
import environment from '../config/environment.js'

const logger = pino({
  level: environment.logLevel,
  serializers: {
    error: (error) => {
      if (error instanceof Error) {
        return {
          type: error.name,
          message: error.message,
          statusCode: error.statusCode || error.status || HTTP_STATUS.INTERNAL_ERROR,
          isOperational: error.isOperational,
          stack: error.stack,
        }
      }

      return pino.stdSerializers.err(error)
    },
  },
  transport: !environment.isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

export default logger
