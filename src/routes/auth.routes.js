import express from 'express'

import {
  authLimiter,
  deleteSession,
  getCurrentUser,
  getSessions,
  login,
  logout,
  logoutAll,
  otpLimiter,
  register,
  resetPassword,
  verifyRegisterOtp,
  verifyResetPasswordOtp,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  deleteSessionParamsSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyRegisterOtpSchema,
  verifyResetPasswordOtpSchema,
} from '../validations/auth.validation.js'

const router = express.Router()

// GET
router.get('/sessions', authenticate, getSessions)
router.get('/current', authenticate, getCurrentUser)

// POST
router.post('/login', authLimiter, validate(loginSchema), login)

router.post('/register', otpLimiter, validate(registerSchema), register)
router.post('/verify-register', authLimiter, validate(verifyRegisterOtpSchema), verifyRegisterOtp)

router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), resetPassword)
router.post(
  '/verify-reset-password',
  authLimiter,
  validate(verifyResetPasswordOtpSchema),
  verifyResetPasswordOtp,
)

router.post('/logout', authenticate, logout)
router.post('/logout-all', authenticate, logoutAll)

// DELETE
router.delete(
  '/sessions/:sessionId',
  authenticate,
  validate(deleteSessionParamsSchema, 'params'),
  deleteSession,
)

export default router
