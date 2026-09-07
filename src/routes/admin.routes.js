import express from 'express'

import { getAdminDashboardAnalytics } from '../controllers/admin.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache } from '../middlewares/cache.middleware.js'

const router = express.Router()

router.get(
  '/dashboard/analytics',
  authenticate,
  authorize('admin'),
  cache(),
  getAdminDashboardAnalytics,
)

export default router
