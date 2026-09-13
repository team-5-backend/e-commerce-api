import express from 'express'

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/user.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache, clearCache } from '../middlewares/cache.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createUserSchema, updateUserSchema } from '../validations/user.validation.js'

const router = express.Router()

router.use(authenticate)

// GET
router.get('/', authorize('admin'), cache(), getUsers)
router.get('/:id', authorize('admin'), cache(), getUserById)

// POST
router.post('/', authorize('admin'), validate(createUserSchema), clearCache('/users'), createUser)

// PATCH
router.patch('/:id', validate(updateUserSchema), clearCache('/users'), updateUser)

// DELETE
router.delete('/:id', authorize('admin'), clearCache('/users'), deleteUser)

export default router
