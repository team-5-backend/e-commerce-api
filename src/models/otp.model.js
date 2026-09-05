import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import validator from 'validator'

import { MODEL_CONFIGS } from './../config/constants'

const OTPschema = new mongoose.Schema(
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
    },

    userData: {
      type: Object,
      default: null,
    },

    attempts: {
      type: Number,
      default: 0,
    },
  },
  MODEL_CONFIGS,
)

OTPschema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

OTPschema.pre('save', async function () {
  if (!this.isModified('otp')) return

  const salt = await bcrypt.genSalt(10)
  this.otp = await bcrypt.hash(this.otp, salt)
})

export const OTP = mongoose.model('OTP', OTPschema)
