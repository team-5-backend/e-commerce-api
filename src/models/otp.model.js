import mongoose from 'mongoose'

import { MODEL_CONFIGS } from '../config/constants'

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: '5m',
    },
  },
  MODEL_CONFIGS,
)

export const OTP = mongoose.model('OTP', otpSchema)
