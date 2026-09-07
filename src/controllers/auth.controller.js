import { rateLimit } from 'express-rate-limit'

import { COOKIE_OPTIONS, HTTP_STATUS } from '../config/constants.js'
import { User } from '../models/index.js'
import {
  generateTokens,
  getAllSessions,
  revokeRefreshToken,
  revokeUserSessions,
} from '../redis/jwtService.js'
import { generateSecureOtp, saveOtp, verifyOtp } from '../redis/otpService.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { genericMessageHtml, otpHtml, passwordOtpHtml } from '../utils/htmlTemplates.js'
import { sendEmail } from '../utils/send.js'

////////////////////////////////////////////////////////////////////////

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const ip = req.ip
  const userAgent = req.headers['user-agent']

  const user = await User.findOne({ email }).select('+password').exec()
  if (!user)
    throw new AppError('Unable to login. Email or password is invalid.', HTTP_STATUS.UNAUTHORIZED)

  const isValid = await user.comparePassword(password)
  if (!isValid)
    throw new AppError('Unable to login. Email or password is invalid.', HTTP_STATUS.UNAUTHORIZED)

  const { accessToken, refreshToken } = await generateTokens({
    userId: user._id,
    userRole: user.role,
    ip,
    userAgent,
  })

  res.cookie('accessToken', accessToken, COOKIE_OPTIONS)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send({
    success: true,
    message: 'Logged in successfully.',
  })
})

////////////////////////////////////////////////////////////////////////

export const register = asyncHandler(async (req, res) => {
  const { username, phone, email, password } = req.body
  const successResponse = {
    success: true,
    message: 'If an account exists, an OTP has been sent.',
  }

  const exists = await User.findOne({ email }).lean().exec()
  if (exists) {
    await sendEmail({
      to: email,
      subject: 'Registration Attempt',
      html: genericMessageHtml(
        'Account Already Exists',
        'An attempt to register an account with this email address was made, but you already have an active account with us. You can proceed to log in.',
      ),
    })
    return res.status(HTTP_STATUS.OK).send(successResponse)
  }

  const otp = generateSecureOtp()

  await saveOtp({
    email,
    otp,
    userData: { username, phone, email, password },
  })

  await sendEmail({
    to: email,
    subject: 'Verify account creation.',
    html: otpHtml(otp),
  })

  res.status(HTTP_STATUS.OK).send(successResponse)
})

////////////////////////////////////////////////////////////////////////

export const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body
  const ip = req.ip
  const userAgent = req.headers['user-agent']

  const userData = await verifyOtp({
    email,
    otp,
  })

  const user = await User.create({ ...userData, isVerified: true })

  const { accessToken, refreshToken } = await generateTokens({
    userId: user._id,
    userRole: user.role,
    ip,
    userAgent,
  })

  res.cookie('accessToken', accessToken, COOKIE_OPTIONS)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send({
    success: true,
    message: 'Account created successfully',
    data: { _id: user._id, username: user.username, email: user.email },
  })
})

////////////////////////////////////////////////////////////////////////

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const successResponse = {
    success: true,
    message: 'If an account exists, an OTP has been sent.',
  }

  const exists = await User.findOne({ email }).lean().exec()

  if (exists) {
    const otp = generateSecureOtp()

    await saveOtp({
      email,
      otp,
    })

    await sendEmail({
      to: email,
      subject: 'Verify password reset.',
      html: passwordOtpHtml(otp),
    })
  }

  res.status(HTTP_STATUS.OK).send(successResponse)
})

////////////////////////////////////////////////////////////////////////

export const verifyForgotPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body
  const ip = req.ip
  const userAgent = req.headers['user-agent']

  await verifyOtp({
    email,
    otp,
  })

  const user = await User.findOne({ email }).exec()
  if (!user) {
    throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND)
  }

  user.password = newPassword
  await user.save()

  await revokeUserSessions(user._id)

  const { accessToken, refreshToken } = await generateTokens({
    userId: user._id,
    userRole: user.role,
    ip,
    userAgent,
  })

  res.cookie('accessToken', accessToken, COOKIE_OPTIONS)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send({
    success: true,
    message: 'Password changed successfully.',
    data: { _id: user._id, username: user.username, email: user.email },
  })
})

////////////////////////////////////////////////////////////////////////

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken
  const userId = req.user._id

  await revokeRefreshToken(refreshToken, userId)

  res.clearCookie('accessToken', COOKIE_OPTIONS)
  res.clearCookie('refreshToken', COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send({
    success: true,
    message: 'Logged out successfully.',
  })
})

////////////////////////////////////////////////////////////////////////

export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user._id

  await revokeUserSessions(userId)

  res.clearCookie('accessToken', COOKIE_OPTIONS)
  res.clearCookie('refreshToken', COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send({
    success: true,
    message: 'Logged out successfully from all devices.',
  })
})

////////////////////////////////////////////////////////////////////////

export const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const sessions = await getAllSessions(userId)

  res.status(HTTP_STATUS.OK).send({
    success: true,
    message: 'Sessions retrieved successfully.',
    data: sessions,
  })
})

////////////////////////////////////////////////////////////////////////

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

////////////////////////////////////////////////////////////////////////

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again after an hour',
  },
})
