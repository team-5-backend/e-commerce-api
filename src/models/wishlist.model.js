import mongoose from 'mongoose'

import { MODEL_CONFIGS } from '../config/constants'

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  MODEL_CONFIGS,
)

export const Wishlist = mongoose.model('Wishlist', wishlistSchema)
