import compression from 'compression'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import { corsOptions } from './config/corsOptions.js'
import router from './routes/index.js'

const app = express()

// Security
app.use(helmet())
app.use(compression())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }))

// CORS
app.use(cors(corsOptions))

// Body Parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/v1', router)

export default app
