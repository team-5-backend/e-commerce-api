import { Router } from 'express'
import Joi from 'joi'

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
import upload from '../middlewares/upload.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  createProductSchema,
  productQuerySchema,
  reviewSchema,
  searchProductSchema,
  updateProductSchema,
} from '../validations/product.validation.js'
import objectIdSchema from '../validations/schemas/id.schema.js'

const router = Router()

const paramSchema = Joi.object({
  id: objectIdSchema.required(),
})

const reviewParamSchema = Joi.object({
  id: objectIdSchema.required(),
  reviewId: objectIdSchema.required(),
})

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================

router.get('/', validate(productQuerySchema, 'query'), getActiveProducts)
router.get('/search', validate(searchProductSchema, 'query'), searchProducts)
router.get('/:id', validate(paramSchema, 'params'), getProductById)
router.get('/:id/reviews', validate(paramSchema, 'params'), getReviews)

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.use(authenticate)

router.post('/:id/reviews', validate(paramSchema, 'params'), validate(reviewSchema), addReview)
router.delete('/:id/reviews/:reviewId', validate(reviewParamSchema, 'params'), deleteReview)

// ==========================================
// ADMIN ROUTES
// ==========================================

router.use(authorize('admin'))

router.post('/', upload.array('images', 10), validate(createProductSchema), createProduct)
router.patch(
  '/:id',
  upload.array('images', 10),
  validate(paramSchema, 'params'),
  validate(updateProductSchema),
  updateProduct,
)
router.delete('/:id', validate(paramSchema, 'params'), deleteProduct)

export default router
