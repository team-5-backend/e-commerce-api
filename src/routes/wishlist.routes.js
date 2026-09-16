import { Router } from 'express'

import {
  addToWishlist,
  clearWishlist,
  getMyWishlist,
  removeFromWishlist,
} from '../controllers/wishlist.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.js'
import objectIdSchema from '../validations/schemas/id.schema.js'

/////////////////////////////////////

const router = Router()
router.use(authenticate)

/////////////////////////////////////

// http://localhost:5000/api/v1/wishlists/my
router.get('/my', getMyWishlist)

// http://localhost:5000/api/v1/wishlists/add/6aa78b77194d7f17ab6dc2b9
router.post('/add/:id', validate(objectIdSchema, 'params'), addToWishlist)

// http://localhost:5000/api/v1/wishlists/remove/6aa78b3d194d7f17ab6dc2b8
router.delete('/remove/:id', validate(objectIdSchema, 'params'), removeFromWishlist)

// http://localhost:5000/api/v1/wishlists/clear
router.delete('/clear', clearWishlist)

//////////////////////////////////////////
export default router
