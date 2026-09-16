import express from 'express'

import { HTTP_STATUS } from '../config/constants.js'

import adminRoutes from './admin.routes.js'
import authRoutes from './auth.routes.js'
import cartRoutes from './cart.routes.js'
import orderRoutes from './order.routes.js'
import productRoutes from './product.routes.js'
import userRoutes from './user.routes.js'
import wishlistRoutes from './wishlist.routes.js'

////////////////////////////////////////////////////////////////////

const router = express.Router()

router.get('/health', (_req, res) =>
  res.status(HTTP_STATUS.OK).send({
    status: 'OK',
    timestamp: new Date().toISOString(),
  }),
)

router.get('/docs', (_req, res) => {
  res.render('docs')
})

////////////////////////////////////////////////////////////////////

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use('/users', userRoutes)
router.use('/carts', cartRoutes)
router.use('/orders', orderRoutes)
router.use('/products', productRoutes)
router.use('/wishlists', wishlistRoutes)

////////////////////////////////////////////////////////////////////

export default router
