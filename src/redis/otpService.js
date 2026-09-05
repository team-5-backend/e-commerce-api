import { HTTP_STATUS } from '../config/constants.js'
import AppError from '../utils/appError.js'
import { createOtpSchema, verifyOtpSchema } from '../validations/otp.validation.js'

import redisClient from './redisClient.js'

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex')

export const saveOtp = async (email, plainOtp, userData = null, newPassword = null) => {
  const { value, error } = createOtpSchema.validate({
    email,
    otp: plainOtp,
    userData,
    newPassword,
  })
  if (error)
    throw new AppError(`Schema validation failed: ${error.message}`, HTTP_STATUS.BAD_REQUEST)

  const payload = JSON.stringify({
    otp: hashOtp(value.otp),
    attempts: 5,
    userData,
    newPassword,
  })

  await redisClient.setEx(`otp:${email}`, 10 * 60, payload)
}

export const verifyOtp = async (email, candidateOtp) => {
  const { value, error } = verifyOtpSchema.validate({
    email,
    otp: candidateOtp,
  })
  if (error)
    throw new AppError(`Schema validation failed: ${error.message}`, HTTP_STATUS.BAD_REQUEST)

  const key = `otp:${value.email}`
  const dataString = await redisClient.get(key)

  if (!dataString) throw new AppError('OTP expired or not found', HTTP_STATUS.NOT_FOUND)

  const data = JSON.parse(dataString)

  if (data.attempts <= 0) {
    await redisClient.del(key)
    throw new AppError('Maximum attempts reached', HTTP_STATUS.FORBIDDEN)
  }

  const isValid = hashOtp(value.otp) === data.otp

  if (!isValid) {
    data.attempts -= 1
    await redisClient.set(key, JSON.stringify(data), { KEEPTTL: true })
    throw new AppError(`Invalid OTP. ${data.attempts} attempts left.`, HTTP_STATUS.FORBIDDEN)
  }

  await redisClient.del(key)
  return { userData: data.userData, newPassword: data.newPassword }
}
