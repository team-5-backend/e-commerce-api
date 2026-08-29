import express from 'express'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

export default router
