import { HTTP_STATUS } from './constants.js'
import environment from './environment.js'

const allowedOrigins = environment.allowedOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = Object.freeze({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      return callback(null, true)
    } else {
      return callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: HTTP_STATUS.OK,
  maxAge: 60 * 60 * 24,
})

export default corsOptions
