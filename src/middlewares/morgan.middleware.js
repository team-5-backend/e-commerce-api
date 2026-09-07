import morgan from 'morgan'

import environment from '../config/environment.js'
import logger from '../utils/logger.js'

const stream = {
  write: (message) => logger.info(message.trim()),
}

const skip = () => environment.nodeEnv === 'test'

const format = environment.isProduction
  ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms'
  : 'dev'

const morganMiddleware = morgan(format, { stream, skip })

export default morganMiddleware
