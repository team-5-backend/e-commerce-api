import express from 'express'

import authRouter from './auth.routes.js'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.use('/auth', authRouter)

export default router
