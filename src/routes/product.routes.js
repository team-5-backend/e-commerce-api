import express from 'express'

import {
  addReview,
  createProduct,
  deleteProduct,
  deleteReview,
  getActiveProducts,
  getProductById,
  getReviews,
  searchProducts,
  updateProduct,
} from '../controllers/product.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache } from '../middlewares/cache.middleware.js'
import upload from '../middlewares/upload.middleware.js'
import validateBody from '../middlewares/validateBody.js'
import validateQuery from '../middlewares/validateQuery.js'
import {
  createProductSchema,
  productQuerySchema,
  reviewSchema,
  searchProductSchema,
  updateProductSchema,
} from '../validations/product.validation.js'

const router = express.Router()

// PUBLIC PRODUCT ROUTES

// Search must come before /:id
router.get('/search', validateQuery(searchProductSchema), cache(300), searchProducts)

router.get('/', validateQuery(productQuerySchema), cache(300), getActiveProducts)

router.get('/:id/reviews', getReviews)

router.get('/:id', getProductById)

// ADMIN PRODUCT ROUTES

router.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.array('images', 5),
  validateBody(createProductSchema),
  createProduct,
)

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  upload.array('images', 5),
  validateBody(updateProductSchema),
  updateProduct,
)

router.delete('/:id', authenticate, authorize('admin'), deleteProduct)

// REVIEW ROUTES

router.post('/:id/reviews', authenticate, validateBody(reviewSchema), addReview)

router.delete('/:id/reviews/:reviewId', authenticate, deleteReview)

export default router
