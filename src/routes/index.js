import express from 'express'

import { HTTP_STATUS } from '../config/constants.js'

import adminRoutes from './admin.routes.js'
import authRoutes from './auth.routes.js'
import cartRoutes from './cart.routes.js'
import wishlistRoutes from './wishlist.routes.js'

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(HTTP_STATUS.OK).send({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use('/carts', cartRoutes)
router.use('/wishlists', wishlistRoutes)

export default router
