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
import { validate, validateParams } from '../middlewares/validate.middleware.js'
import {
  addCartItemSchema,
  applyCouponSchema,
  productIdParamsSchema,
  updateCartItemSchema,
} from '../validations/cart.validation.js'

const router = Router()

router.use(authenticate)

router.get('/', getCart)
router.post('/items', validate(addCartItemSchema), addCartItem)
router.patch('/items', validate(updateCartItemSchema), updateCartItem)
router.delete('/items/:productId', validateParams(productIdParamsSchema), removeCartItem)
router.post('/coupon', validate(applyCouponSchema), applyCoupon)
router.delete('/coupon', removeCoupon)
router.delete('/clear', clearCart)

export default router
