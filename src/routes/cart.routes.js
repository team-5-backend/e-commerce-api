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
import validate from '../middlewares/validate.js'
import {
  addCartItemSchema,
  applyCouponSchema,
  updateCartItemSchema,
} from '../validations/cart.validation.js'
import objectIdSchema from '../validations/schemas/id.schema.js'

//////////////////////////////////////////////////////
const router = Router()
router.use(authenticate)
//////////////////////////////////////////////////////

// http://localhost:3000/api/v1/carts
router.get('/', getCart)

// http://localhost:3000/api/v1/carts/clear
router.delete('/clear', clearCart)

// http://localhost:3000/api/v1/carts/items
router.post('/items', validate(addCartItemSchema), addCartItem)

// http://localhost:3000/api/v1/carts/items
router.patch('/items', validate(updateCartItemSchema), updateCartItem)

// http://localhost:3000/api/v1/carts/items/6aa78b77194d7f17ab6dc2b9
router.delete('/items/:id', validate(objectIdSchema, 'params'), removeCartItem)

//  http://localhost:3000/api/v1/carts/coupon
router.post('/coupon', validate(applyCouponSchema), applyCoupon)

//  http://localhost:3000/api/v1/carts/coupon
router.delete('/coupon', removeCoupon)

//////////////////////////////////////////////////////

export default router
