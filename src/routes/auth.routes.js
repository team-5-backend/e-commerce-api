import express from 'express'

import {
  authLimiter,
  deleteSession,
  forgotPassword,
  getMe,
  getSessions,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  verifyForgotPasswordOtp,
  verifyRegisterOtp,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.js'
import {
  deleteSessionParamsSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  verifyForgotPasswordOtpSchema,
  verifyRegisterOtpSchema,
} from '../validations/auth.validation.js'

/////////////////////////////////////////////////////////////////////

const router = express.Router()

// http://localhost:3000/api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), login)

// http://localhost:3000/api/v1/auth/register/send-otp
router.post('/register/send-otp', authLimiter, validate(registerSchema), register)

// http://localhost:3000/api/v1/auth/register/verify-otp
router.post(
  '/register/verify-otp',
  authLimiter,
  validate(verifyRegisterOtpSchema),
  verifyRegisterOtp,
)

// http://localhost:3000/api/v1/auth/forgotpassword/send-otp
router.post('/forgotpassword/send-otp', authLimiter, validate(forgotPasswordSchema), forgotPassword)

// http://localhost:3000/api/v1/auth/forgotpassword/verify-otp
router.post(
  '/forgotpassword/verify-otp',
  authLimiter,
  validate(verifyForgotPasswordOtpSchema),
  verifyForgotPasswordOtp,
)

// http://localhost:3000/api/v1/auth/logout
router.post('/logout', authenticate, logout)

// http://localhost:3000/api/v1/auth/logout-all
router.post('/logout-all', authenticate, logoutAll)

// http://localhost:3000/api/v1/auth/refresh
router.post('/refresh', refresh)

// http://localhost:3000/api/v1/auth/sessions
router.get('/sessions', authenticate, getSessions)

// http://localhost:3000/api/v1/auth/me
router.get('/me', authenticate, getMe)

// http://localhost:3000/api/v1/auth/sessions/:sessionId
router.delete(
  '/sessions/:sessionId',
  authenticate,
  validate(deleteSessionParamsSchema, 'params'),
  deleteSession,
)

/////////////////////////////////////////////////////////////////
export default router
