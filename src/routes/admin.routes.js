import express from 'express'

import {
  getAdminDashboardAnalytics,
  getAllActiveCarts,
  getAllUserWishlists,
  getTopWishlistedProducts,
} from '../controllers/admin.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache } from '../middlewares/cache.middleware.js'

const router = express.Router()

router.use(authenticate)
router.use(authorize('admin'))

// GET
router.get('/dashboard', cache(), getAdminDashboardAnalytics)
router.get('/carts', getAllActiveCarts)
router.get('/wishlists', getAllUserWishlists)
router.get('/wishlists/top', cache(), getTopWishlistedProducts)

export default router
