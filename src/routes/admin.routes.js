import express from 'express';

import { getAdminDashboardAnalytics } from '../controllers/admin.controller.js';
// import { auth, AllowedTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/dashboard/analytics', getAdminDashboardAnalytics);

export default router;