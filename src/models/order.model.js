import mongoose from 'mongoose'

import addressSchema from './schemas/address.schema'
import orderItemSchema from './schemas/orderItem.schema'

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    },

    tax: {
      type: Number,
    },

    discount: {
      type: Number,
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
  { timestamps: true },
)

module.exports = mongoose.model('Order', orderSchema)
