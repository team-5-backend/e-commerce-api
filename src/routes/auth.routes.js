import express from 'express'

import {
  authLimiter,
  deleteSession,
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
import validateBody from '../middlewares/validateBody.js'
import validateParams from '../middlewares/validateParams.js'
import {
  deleteSessionParamsSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  verifyForgotPasswordOtpSchema,
  verifyRegisterOtpSchema,
} from '../validations/auth.validation.js'

const router = express.Router()

router.post('/login', authLimiter, validateBody(loginSchema), login)
router.post('/register', otpLimiter, validateBody(registerSchema), register)
router.post(
  '/verify-register',
  authLimiter,
  validateBody(verifyRegisterOtpSchema),
  verifyRegisterOtp,
)

router.post('/forgot-password', otpLimiter, validateBody(forgotPasswordSchema), forgotPassword)
router.post(
  '/verify-forgot-password',
  authLimiter,
  validateBody(verifyForgotPasswordOtpSchema),
  verifyForgotPasswordOtp,
)

router.post('/logout', authenticate, logout)
router.post('/logout-all', authenticate, logoutAll)

router.get('/sessions', authenticate, getSessions)
router.delete(
  '/sessions/:sessionId',
  authenticate,
  validateParams(deleteSessionParamsSchema),
  deleteSession,
)

export default router
