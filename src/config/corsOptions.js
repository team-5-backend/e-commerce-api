import cors from 'cors'

const allowedOrigins = ['http://localhost:3000']

export const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      return callback(null, true)
    } else {
      return callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  optionsSuccessStatus: 200,
}
