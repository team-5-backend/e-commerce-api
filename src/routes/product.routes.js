import express from 'express'

import {
  addReview,
  createProduct,
  deleteProduct,
  deleteReview,
  getProductById,
  getProducts,
  getReviews,
  updateProduct,
} from '../controllers/product.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache } from '../middlewares/cache.middleware.js'
import { clearCache } from '../middlewares/clearCache.js'
import upload from '../middlewares/upload.middleware.js'
import validate from '../middlewares/validate.js'
import {
  createProductSchema,
  productQuerySchema,
  reviewParamsSchema,
  reviewSchema,
  updateProductSchema,
} from '../validations/product.validation.js'
import objectIdSchema from '../validations/schemas/id.schema.js'

////////////////////////////////////////////////////////////////////////////
const router = express.Router()

router.get('/search', validate(productQuerySchema, 'query'), cache(300), getProducts)

// http://localhost:3000/api/v1/products
// http://localhost:3000/api/v1/products?category=electronics&minPrice=50&maxPrice=150
// http://localhost:3000/api/v1/products?category=notebook&minPrice=1000&maxPrice=2000&sortBy=price&sortOrder=desc&page=1&limit=5
router.get('/', validate(productQuerySchema, 'query'), cache(300), getProducts)

router.get('/:id/reviews', validate(objectIdSchema, 'params'), cache(300), getReviews)

// http://localhost:3000/api/v1/products/
router.get('/:id', validate(objectIdSchema, 'params'), cache(300), getProductById)

// http://localhost:3000/api/v1/products/
router.post(
  '/',
  authenticate,
  authorize('admin'),
  upload.array('images', 5),
  validate(createProductSchema),
  clearCache('products'),
  createProduct,
)

// http://localhost:3000/api/v1/products/6aa78ac6194d7f17ab6dc2b7
router.patch(
  '/:id',
  validate(objectIdSchema, 'params'),
  authenticate,
  authorize('admin'),
  upload.array('images', 5),
  validate(updateProductSchema),
  clearCache('products'),
  updateProduct,
)

// http://localhost:3000/api/v1/products/6aa78ac6194d7f17ab6dc2b7
router.delete(
  '/:id',
  validate(objectIdSchema, 'params'),
  authenticate,
  authorize('admin'),
  clearCache('products'),
  deleteProduct,
)

// http://localhost:3000/api/v1/products/6aa78ac6194d7f17ab6dc2b7/reviews
router.post(
  '/:id/reviews',
  validate(objectIdSchema, 'params'),
  authenticate,
  validate(reviewSchema),
  clearCache('products'),
  addReview,
)

// http://localhost:3000/api/v1/products/6aa793ae7f0cdf585bdb228e/reviews/6aa79695dbbd77f53e600042
router.delete(
  '/:id/reviews/:reviewId',
  validate(reviewParamsSchema, 'params'),
  authenticate,
  clearCache('products'),
  deleteReview,
)

////////////////////////////////////////

export default router
