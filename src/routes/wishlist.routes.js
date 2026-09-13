import { Router } from 'express'

import {
  addToWishlist,
  clearWishlist,
  getUserWishlist,
  removeFromWishlist,
} from '../controllers/wishlist.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  addToWishlistSchema,
  deleteWishlistParamsSchema,
} from '../validations/wishlist.validation.js'

const router = Router()

router.use(authenticate)

// GET
router.get('/', getUserWishlist)

// POST
router.post('/', validate(addToWishlistSchema), addToWishlist)

// DELETE
router.delete('/clear', clearWishlist)
router.delete('/:productId', validate(deleteWishlistParamsSchema, 'params'), removeFromWishlist)

export default router
