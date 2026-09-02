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
import { validate } from '../middlewares/validate.middleware.js'
import {
  addCartItemSchema,
  applyCouponSchema,
  updateCartItemSchema,
} from '../validations/cart.validation.js'

const router = Router()

router.get('/', getCart)
router.post('/items', validate(addCartItemSchema), addCartItem)
router.patch('/items', validate(updateCartItemSchema), updateCartItem)
router.delete('/items/:productId', removeCartItem)
router.post('/coupon', validate(applyCouponSchema), applyCoupon)
router.delete('/coupon', removeCoupon)
router.delete('/clear', clearCart)

export default router
