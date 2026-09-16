import mongoose from 'mongoose'

import { MODEL_OPTIONS } from '../config/constants.js'

import addressSchema from './schemas/address.schema.js'
import orderItemSchema from './schemas/orderItem.schema.js'

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
    },

    shippingAddress: {
      type: addressSchema,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'stripe', 'paypal', 'paymob'],
      default: 'cash',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    transactionId: {
      type: String,
    },

    subtotal: {
      type: Number,
      required: true,
    },

    shippingFee: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
      validate: {
        validator: function (val) {
          return this.subtotal === undefined || val < this.subtotal
        },
        message: 'Discount amount cannot be greater than or equal to the subtotal',
      },
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },

    paidAt: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    customerNote: {
      type: String,
      maxlength: 1000,
    },

    adminNote: {
      type: String,
      maxlength: 1000,
    },
  },
  MODEL_OPTIONS,
)

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
