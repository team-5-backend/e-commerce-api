import { Router } from 'express'

import {
  addToWishlist,
  clearWishlist,
  getMyWishlist,
  removeFromWishlist,
} from '../controllers/wishlist.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import { validateParams } from '../middlewares/validate.middleware.js'
import { productIdParamsSchema } from '../validations/wishlist.validation.js'

const router = Router()

router.use(authenticate)

router.get('/my', getMyWishlist)
router.post('/add/:productId', validateParams(productIdParamsSchema), addToWishlist)
router.delete('/remove/:productId', validateParams(productIdParamsSchema), removeFromWishlist)
router.delete('/clear', clearWishlist)

export default router
