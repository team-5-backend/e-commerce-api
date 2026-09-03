import mongoose from 'mongoose'

import orderItemSchema from '../schemas/orderItem.schema'

import { MODEL_CONFIGS } from './../config/constants'

const cartItemSchema = orderItemSchema.clone()

cartItemSchema.forEachPath((_, schemaType) => {
  schemaType.required(false)
})

cartItemSchema.add({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
})

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    coupon: {
      code: {
        type: String,
        uppercase: true,
        trim: true,
      },

      discountType: {
        type: String,
        trim: true,
        enum: ['percentage', 'fixed'],
      },

      discountValue: {
        type: Number,
        min: [0, 'Discount value cannot be negative'],
      },
    },
  },
  MODEL_CONFIGS,
)

cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0)
})

cartSchema.virtual('discountAmount').get(function () {
  if (!this.coupon || !this.coupon.discountValue) return 0

  if (this.coupon.discountType === 'percentage') {
    return (this.subtotal * this.coupon.discountValue) / 100
  }

  if (this.coupon.discountType === 'fixed') {
    return Math.min(this.coupon.discountValue, this.subtotal)
  }

  return 0
})

cartSchema.virtual('total').get(function () {
  return Math.max(0, this.subtotal - this.discountAmount)
})

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((total, item) => (total || 0) + (item.quantity || 0), 0)
})

export const Cart = mongoose.model('Cart', cartSchema)
