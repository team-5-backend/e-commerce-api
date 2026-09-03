import mongoose from 'mongoose'
import slugify from 'slugify'

import { MODEL_CONFIGS } from '../config/constants'

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },

    shortDescription: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      min: 0,
      default: 0,

      validate: {
        validator: function (val) {
          return !this.price || val < this.price
        },

        message: 'Discount price must be lower than original price',
      },
    },

    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
    },

    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    images: {
      type: [
        {
          public_id: {
            type: String,
            required: true,
            trim: true,
          },

          url: {
            type: String,
            required: true,
            trim: true,
          },

          _id: false,
        },
      ],
      required: true,
      validate: {
        validator: function (images) {
          return Array.isArray(images) && images.length >= 1
        },
        message: 'At least one image is required',
      },
    },

    category: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },

    subcategory: {
      type: String,
      lowercase: true,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
    },

    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },

        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },

        comment: {
          type: String,
          trim: true,
          required: true,
        },
      },
    ],

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    numReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  MODEL_CONFIGS,
)

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    })
    this.slug = `${baseSlug}-${Date.now().toString().slice(-6)}`
  }
  next()
})

productSchema.methods.calcAverageRating = function () {
  if (!this.reviews || this.reviews.length === 0) {
    this.averageRating = 0
    this.numReviews = 0
  } else {
    const total = this.reviews.reduce((acc, cur) => acc + cur.rating, 0)
    this.numReviews = this.reviews.length
    this.averageRating = Number((total / this.numReviews).toFixed(2))
  }
}

productSchema.index({ name: 'text', description: 'text', brand: 'text' })
productSchema.index({ category: 1, price: 1 })
productSchema.index({ brand: 1 })
productSchema.index({ averageRating: -1 })
productSchema.index({ createdAt: -1 })

export const Product = mongoose.model('Product', productSchema)
