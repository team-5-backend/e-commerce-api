import express from 'express'

import {
  getAdminDashboardAnalytics,
  getAllActiveCarts,
  getAllUserWishlists,
  getTopWishlistedProducts,
} from '../controllers/admin.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache } from '../middlewares/cache.middleware.js'

/////////////////////////////////////////////////////////////////////

const router = express.Router()
router.use(authenticate)
router.use(authorize('admin'))

/////////////////////////////////////////////////////////////////////

// http://localhost:3000/api/v1/admin/dashboard
router.get('/dashboard', cache(), getAdminDashboardAnalytics)

// http://localhost:3000/api/v1/admin/carts
router.get('/carts', getAllActiveCarts)

// http://localhost:3000/api/v1/admin/wishlists
router.get('/wishlists', getAllUserWishlists)

// http://localhost:3000/api/v1/admin/wishlists/stats
router.get('/wishlists/stats', cache(), getTopWishlistedProducts)

export default router
