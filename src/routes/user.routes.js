import express from 'express'

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/user.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import upload from '../middlewares/upload.middleware.js'
import validate from '../middlewares/validate.js'
import { createUserSchema, updateUserSchema } from '../validations/user.validation.js'

import objectIdSchema from './../validations/schemas/id.schema.js'

////////////////////////////////////////////

const router = express.Router()
router.use(authenticate)
////////////////////////////////////////////
// http://localhost:5000/api/v1/users/all
router.get('/all', authorize('admin'), getUsers)

// http://localhost:5000/api/v1/users/add
router.post(
  '/add',
  authorize('admin'),
  upload.single('avatar'),
  validate(createUserSchema),
  createUser,
)

// http://localhost:5000/api/v1/users/6aa73645fc10839d57d4b55a
router.get('/:id', authorize('admin'), validate(objectIdSchema, 'params'), getUserById)

router.patch(
  '/:id',
  validate(objectIdSchema, 'params'),
  upload.single('avatar'),
  validate(updateUserSchema),
  updateUser,
)

router.delete('/:id', authorize('admin'), validate(objectIdSchema, 'params'), deleteUser)

//////////////////////////////////////////////////////////////////
export default router
