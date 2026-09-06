import express from 'express'
import adminRoutes from './admin.routes.js'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.use('/admin', adminRoutes)

export default router
