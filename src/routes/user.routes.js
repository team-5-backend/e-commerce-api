import express from 'express'

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/user.controller.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'

const router = express.Router()

// Applies the authenticate middleware to all routes below this line
router.use(authenticate)

router.patch('/:id', updateUser)

// Applies the authorize('admin') middleware to all routes below this line
router.use(authorize('admin'))

router.get('/all', getUsers)
router.get('/:id', getUserById)

router.post('/add', createUser)

router.delete('/:id', deleteUser)

export default router
