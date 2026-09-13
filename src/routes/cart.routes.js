import { Router } from 'express'

import {
  addCartItem,
  applyCoupon,
  clearCart,
  getCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '../controllers/cart.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  addCartItemSchema,
  applyCouponSchema,
  deleteCartItemParamsSchema,
  updateCartItemSchema,
} from '../validations/cart.validation.js'

const router = Router()

router.use(authenticate)

// GET
router.get('/', getCart)

// POST
router.post('/items', validate(addCartItemSchema), addCartItem)
router.post('/coupon', validate(applyCouponSchema), applyCoupon)

// PATCH
router.patch('/items', validate(updateCartItemSchema), updateCartItem)

// DELETE
router.delete('/items/:productId', validate(deleteCartItemParamsSchema, 'params'), removeCartItem)
router.delete('/coupon', removeCoupon)
router.delete('/clear', clearCart)

export default router
