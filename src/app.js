import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import errorHandler from './middlewares/errorHandler.js'
import morganMiddleware from './middlewares/morgan.middleware.js'
import notFoundHandler from './middlewares/notFoundHandler.js'
import router from './routes/index.js'

const app = express()

// Logging
app.use(morganMiddleware)

// Security
app.use(helmet())
app.use(compression())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }))

// CORS
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }))

// Body Parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Cookies Parsing
app.use(cookieParser())

// ErrorHandling
app.use(notFoundHandler)
app.use(errorHandler)

// Routes
app.use('/api/v1', router)

export default app
