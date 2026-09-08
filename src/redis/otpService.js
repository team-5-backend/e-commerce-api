import crypto from 'crypto'

import { HTTP_STATUS, OTP_TTL } from '../config/constants.js'
import { AppError } from '../utils/appError.js'
import { createOtpSchema, verifyOtpSchema } from '../validations/auth.validation.js'

import redisClient from './redisClient.js'

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex')

export const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString()
}

// takes { email, otp, userData }
export const saveOtp = async (schemaPayload) => {
  const { value, error: schemaError } = createOtpSchema.validate(schemaPayload)
  if (schemaError)
    throw new AppError(
      `Schema validation failed: ${schemaError.message}`,
      HTTP_STATUS.BAD_REQUEST,
      {
        cause: schemaError,
      },
    )
  const { email, otp, userData } = value

  const data = JSON.stringify({
    otp: hashOtp(otp),
    attempts: 5,
    userData,
  })

  await redisClient.setEx(`otp:${email}`, OTP_TTL, data)
}

// takes { email, otp }
export const verifyOtp = async (schemaPayload) => {
  const { value, error: schemaError } = verifyOtpSchema.validate(schemaPayload)
  if (schemaError)
    throw new AppError(
      `Schema validation failed: ${schemaError.message}`,
      HTTP_STATUS.BAD_REQUEST,
      {
        cause: schemaError,
      },
    )
  const { email, otp } = value

  const key = `otp:${email}`
  const dataString = await redisClient.get(key)
  if (!dataString) throw new AppError('OTP expired or not found', HTTP_STATUS.NOT_FOUND)

  const data = JSON.parse(dataString)
  const { otp: storedOtp, attempts, userData } = data

  if (attempts <= 0) {
    await redisClient.del(key)
    throw new AppError('Maximum attempts reached', HTTP_STATUS.FORBIDDEN)
  }

  const isValid = hashOtp(otp) === storedOtp

  if (!isValid) {
    data.attempts -= 1
    await redisClient.set(key, JSON.stringify(data), { KEEPTTL: true })
    throw new AppError(`Invalid OTP. ${data.attempts} attempts left.`, HTTP_STATUS.FORBIDDEN)
  }

  await redisClient.del(key)

  return userData
}
