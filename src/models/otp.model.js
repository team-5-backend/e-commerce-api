import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import validator from 'validator'

import { MODEL_OPTIONS } from './../config/constants'

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'invalid email',
      },
      required: true,
      trim: true,
      lowercase: true,
    },

    otp: {
      type: String,
      required: true,
      trim: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // set a default expiration period of 10min
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },

    userData: {
      type: Object,
      default: null,
    },

    attempts: {
      type: Number,
      default: 5,
    },
  },
  MODEL_OPTIONS,
)

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

otpSchema.pre('save', async function () {
  if (!this.isModified('otp')) return

  this.otp = await bcrypt.hash(this.otp, 10)
})

userSchema.methods.compareOtp = async function (candidateOtp) {
  return await bcrypt.compare(candidateOtp, this.otp)
}

export const Otp = mongoose.model('OTP', otpSchema)
