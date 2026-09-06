import express from 'express'

import {
  authLimiter,
  forgotPassword,
  getSessions,
  login,
  logout,
  logoutAll,
  otpLimiter,
  register,
  verifyForgotPasswordOtp,
  verifyRegisterOtp,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/login', authLimiter, login)

router.post('/register', otpLimiter, register)
router.post('/verify-register', authLimiter, verifyRegisterOtp)

router.post('/forgot-password', otpLimiter, forgotPassword)
router.post('/verify-forgot-password', authLimiter, verifyForgotPasswordOtp)

// Applies the authenticate middleware to all routes below this line
router.use(authenticate)

router.post('/logout', logout)
router.post('/logout-all', logoutAll)
router.get('/sessions', getSessions)

export default router
