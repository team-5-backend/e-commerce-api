import express from 'express'

import {
  AdminOrderCarts,
  AdminOrderDashboard,
  cancelOrder,
  createOrder,
  getAdminOrderById,
  getAllOrders,
  getMyOrderById,
  getMyOrders,
  handlePaymobWebhook,
  handlePaypalWebhook,
  handleStripeWebhook,
  updateOrderStatus,
} from '../controllers/order.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.js'
import objectIdSchema from '../validations/schemas/id.schema.js'

import { createOrderSchema } from './../validations/order.validation.js'

/////////////////////////////////////////////////////////////////////////////

const router = express.Router()
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook)
router.post('/webhook/paypal', express.json(), handlePaypalWebhook)
router.post('/webhook/paymob', express.json(), handlePaymobWebhook)

////////////////////////////////////////////////////////////////////////////

router.use(authenticate)

//  http://localhost:3000/api/v1/orders/
router.post('/', validate(createOrderSchema), createOrder)

//  http://localhost:3000/api/v1/orders/my
router.get('/my', getMyOrders)

//  http://localhost:3000/api/v1/orders/my/6aa841a0200fdbcdaf808bd
router.get('/my/:id', validate(objectIdSchema, 'params'), getMyOrderById)

//  http://localhost:3000/api/v1/orders/my/6aa841a0200fdbcdaf808bd/cancel
router.patch('/my/:id/cancel', validate(objectIdSchema, 'params'), cancelOrder)

////////////////////////////////////////////////////////////////////////////

//  http://localhost:3000/api/v1/orders/admin/dashboard
router.get('/admin/dashboard', authorize('admin'), AdminOrderDashboard)

//  http://localhost:3000/api/v1/orders/admin/carts
router.get('/admin/carts', authorize('admin'), AdminOrderCarts)

//  http://localhost:3000/api/v1/orders/admin
router.get('/admin', authorize('admin'), getAllOrders)

//  http://localhost:3000/api/v1/orders/admin/6aa841a0200fdbcdaf808bd9
router.get('/admin/:id', validate(objectIdSchema, 'params'), authorize('admin'), getAdminOrderById)

//  http://localhost:3000/api/v1/orders/admin/6aa841a0200fdbcdaf808bd9/status
router.patch(
  '/admin/:id/status',
  validate(objectIdSchema, 'params'),
  authorize('admin'),
  updateOrderStatus,
)

////////////////////////////////////////////////////////////////////////////

export default router
