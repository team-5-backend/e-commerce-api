import pino from 'pino'

import environment from '../config/environment.js'

const logger = pino({
  level: environment.logLevel,
  serializers: {
    error: (error) => {
      if (!environment.isProduction && error instanceof Error) {
        return error.message
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
