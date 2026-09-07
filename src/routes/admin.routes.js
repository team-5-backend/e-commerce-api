import express from 'express'

import { getAdminDashboardAnalytics } from '../controllers/admin.controller.js'

const router = express.Router()

router.get('/dashboard/analytics', getAdminDashboardAnalytics)

export default router
