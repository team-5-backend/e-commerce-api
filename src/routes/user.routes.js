import express from 'express'

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/user.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { cache } from '../middlewares/cache.middleware.js'

const router = express.Router()

router.get('/all', authenticate, authorize('admin'), cache(), getUsers)
router.get('/:id', authenticate, authorize('admin'), cache(), getUserById)

router.post('/add', authenticate, authorize('admin'), createUser)

router.patch('/:id', authenticate, updateUser)

router.delete('/:id', authenticate, authorize('admin'), deleteUser)

export default router
