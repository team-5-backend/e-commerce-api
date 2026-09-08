import mongoose from 'mongoose'

import { MODEL_OPTIONS } from '../config/constants.js'

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true,
    },

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  MODEL_OPTIONS,
)

wishlistSchema.pre(/^find/, function (next) {
  this.populate('products')
  next()
})

export const Wishlist = mongoose.model('Wishlist', wishlistSchema)
