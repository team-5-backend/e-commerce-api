import express from 'express'

import {
  cancelOrder,
  createOrder,
  getAdminOrderById,
  getAllOrders,
  getMyOrderById,
  getMyOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js'
import { adminOnly } from '../middleware/admin.middleware.js'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { createOrderSchema } from '../validation/order.validation.js'

const router = express.Router()

router.post('/', protect, validate(createOrderSchema), asyncHandler(createOrder))

router.get('/my', protect, asyncHandler(getMyOrders))

router.get('/my/:id', protect, asyncHandler(getMyOrderById))

router.patch('/my/:id/cancel', protect, asyncHandler(cancelOrder))

router.get('/admin', protect, adminOnly, asyncHandler(getAllOrders))

router.get('/admin/:id', protect, adminOnly, asyncHandler(getAdminOrderById))

router.patch('/admin/:id/status', protect, adminOnly, asyncHandler(updateOrderStatus))

export default router
