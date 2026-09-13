import express from 'express'

import {
  AdminCartsDashboard,
  AdminOrderDashboard,
  cancelOrder,
  createOrder,
  getAllOrders,
  getMyOrderById,
  getMyOrders,
  getOrderByIdAdmin,
  handlePaymobWebhook,
  handlePaypalWebhook,
  handleStripeWebhook,
  updateOrderStatus,
} from '../controllers/order.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { createOrderSchema, orderIdParamsSchema } from '../validations/order.validation.js'

const router = express.Router()

// WEBHOOKS
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook)
router.post('/webhook/paypal', handlePaypalWebhook)
router.post('/webhook/paymob', handlePaymobWebhook)

router.use(authenticate)

// ==========================================
// CUSTOMER ROUTES
// ==========================================
// GET
router.get('/my', getMyOrders)
router.get('/my/:id', validate(orderIdParamsSchema, 'params'), getMyOrderById)

// POST
router.post('/', validate(createOrderSchema), createOrder)

// PATCH
router.patch('/my/:id/cancel', validate(orderIdParamsSchema, 'params'), cancelOrder)

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET
// Dashboards
router.get('/admin/dashboard', authorize('admin'), AdminOrderDashboard)
router.get('/admin/carts', authorize('admin'), AdminCartsDashboard)

// Order Management
router.get('/admin/orders', authorize('admin'), getAllOrders)
router.get(
  '/admin/orders/:id',
  authorize('admin'),
  validate(orderIdParamsSchema, 'params'),
  getOrderByIdAdmin,
)

// PATCH
router.patch(
  '/admin/orders/:id/status',
  authorize('admin'),
  validate(orderIdParamsSchema, 'params'),
  updateOrderStatus,
)

export default router
