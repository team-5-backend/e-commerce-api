import mongoose from "mongoose";
import slugify from "slugify";

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
      default: 0,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
    },

    sku: { //Stock Keeping Unit
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    images: [
      {
        public_id: {
          type: String,
          required: true,
        },

        url: {
          type: String,
          required: true,
        },
      },
    ],

    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    subcategory: {
      type: String,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
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
          required: true,
        },
      },
    ],

    averageRating: {
      type: Number,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
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
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique slug before saving
productSchema.pre("save", async function (next) {
  if (!this.isModified("name")) {
    return next();
  }

  const baseSlug = slugify(this.name, {
    lower: true,
    strict: true,
  });

  let slug = baseSlug;
  let counter = 1;

  while (
    await mongoose.models.Product.exists({
      slug,
      _id: { $ne: this._id },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  this.slug = slug;

  next();
});

// Calculate average rating
productSchema.methods.calcAverageRating = function () {
  this.numReviews = this.reviews.length;

  if (this.numReviews === 0) {
    this.averageRating = 0;
    return;
  }

  const totalRating = this.reviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  this.averageRating = Number(
    (totalRating / this.numReviews).toFixed(2)
  );
};

// Text index for search
productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
});

// Indexes for filtering and sorting
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model("Product", productSchema);

export default Product;