import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import validator from 'validator'

import { MODEL_OPTIONS } from '../config/constants.js'

import addressSchema from './schemas/address.schema.js'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Invalid email',
      },
    },

    password: {
      type: String,
      required: true,
      select: false,
      validate: {
        validator: (value) =>
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,26}$/.test(value),
        message: 'Invalid Weak Password',
      },
    },

    phone: {
      type: String,
      validate: {
        validator: (value) => /^(002|02|\+2)?01[0-25]\d{8}$/.test(value),
        message: 'Invalid Egyptian phone number',
      },
    },

    avatar: {
      type: String,
      default: 'https://i.pinimg.com/736x/f5/47/d8/f547d800625af9056d62efe8969aeea0.jpg',
    },

    role: {
      type: String,
      trim: true,
      enum: ['admin', 'customer'],
      default: 'customer',
    },

    addresses: {
      type: [addressSchema],
      default: [],
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpire: {
      type: Date,
    },
  },
  MODEL_OPTIONS,
)

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

export const User = mongoose.model('User', userSchema)
