import { rateLimit } from 'express-rate-limit'

import { COOKIE_OPTIONS, HTTP_STATUS } from '../config/constants.js'
import { User } from '../models/index.js'
import {
  generateTokens,
  getAllSessions,
  revokeRefreshToken,
  revokeSpecificSession,
  revokeUserSessions,
} from '../redis/jwtService.js'
import { generateSecureOtp, saveOtp, verifyOtp } from '../redis/otpService.js'
import { ApiResponse } from '../utils/ApiResponse.js'
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
    throw new AppError(
      'Unable to log in. The email or password is incorrect.',
      HTTP_STATUS.UNAUTHORIZED,
    )

  const isValid = await user.comparePassword(password)
  if (!isValid)
    throw new AppError(
      'Unable to log in. The email or password is incorrect.',
      HTTP_STATUS.UNAUTHORIZED,
    )

  const { accessToken, refreshToken } = await generateTokens({
    userId: user._id,
    userRole: user.role,
    ip,
    userAgent,
  })

  res.cookie('accessToken', accessToken, COOKIE_OPTIONS)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send(new ApiResponse('Logged in successfully.'))
})

////////////////////////////////////////////////////////////////////////

export const register = asyncHandler(async (req, res) => {
  const { username, phone, email, password } = req.body
  const successResponse = new ApiResponse(
    'If an account exists, a verification code has been sent to the email address provided.',
  )

  const exists = await User.findOne({ email }).lean().exec()
  if (exists) {
    await sendEmail({
      to: email,
      subject: 'Registration Attempt',
      html: genericMessageHtml(
        'Account Already Exists',
        'An attempt was made to register an account with this email address, but an account already exists. You can proceed to log in.',
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

  res.status(HTTP_STATUS.CREATED).send(
    new ApiResponse('Account created successfully.', {
      _id: user._id,
      username: user.username,
      email: user.email,
    }),
  )
})

////////////////////////////////////////////////////////////////////////

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const successResponse = new ApiResponse(
    'If an account exists, a password reset code has been sent to the email address provided.',
  )

  const exists = await User.findOne({ email }).lean().exec()

  if (exists) {
    const otp = generateSecureOtp()

    await saveOtp({
      email,
      otp,
    })

    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
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

  res.status(HTTP_STATUS.OK).send(
    new ApiResponse('Password reset successfully.', {
      _id: user._id,
      username: user.username,
      email: user.email,
    }),
  )
})

////////////////////////////////////////////////////////////////////////

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken
  const userId = req.user._id

  await revokeRefreshToken(userId, refreshToken)

  res.clearCookie('accessToken', COOKIE_OPTIONS)
  res.clearCookie('refreshToken', COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send(new ApiResponse('Logged out successfully.'))
})

////////////////////////////////////////////////////////////////////////

export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user._id

  await revokeUserSessions(userId)

  res.clearCookie('accessToken', COOKIE_OPTIONS)
  res.clearCookie('refreshToken', COOKIE_OPTIONS)

  res.status(HTTP_STATUS.OK).send(new ApiResponse('Logged out from all devices successfully.'))
})

////////////////////////////////////////////////////////////////////////

export const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const sessions = await getAllSessions(userId)

  res
    .status(HTTP_STATUS.OK)
    .send(new ApiResponse('Active sessions retrieved successfully.', sessions))
})

////////////////////////////////////////////////////////////////////////

export const deleteSession = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { sessionId } = req.params

  await revokeSpecificSession(userId, sessionId)

  res.status(HTTP_STATUS.OK).send(new ApiResponse('Session revoked successfully.'))
})

////////////////////////////////////////////////////////////////////////

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
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
    message: 'Too many verification code requests. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
