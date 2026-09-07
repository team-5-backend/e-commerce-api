import express from 'express'

import { HTTP_STATUS } from '../config/constants.js'

import authRoutes from './auth.routes.js'
import userRoutes from './user.routes.js'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(HTTP_STATUS.OK).send({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.use('/auth', authRoutes)
router.use('/users', userRoutes)

export default router
