import express from 'express'

import { HTTP_STATUS } from '../config/constants.js'

import adminRoutes from './admin.routes.js'
import authRouter from './auth.routes.js'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(HTTP_STATUS.OK).send({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.use('/admin', adminRoutes)
router.use('/auth', authRouter)

export default router
