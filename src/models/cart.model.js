import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    name: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    items: {
      type: [cartItemSchema],
      default: []
    },
    coupon: {
      code: String,
      discountType: {
        type: String,
        enum: ["percentage", "fixed"]
      },
      discountValue: Number
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
});

cartSchema.virtual("discountAmount").get(function () {
  if (!this.coupon) return 0;

  if (this.coupon.discountType === "percentage") {
    return (this.subtotal * this.coupon.discountValue) / 100;
  }

  return Math.min(this.coupon.discountValue, this.subtotal);
});

cartSchema.virtual("total").get(function () {
  return this.subtotal - this.discountAmount;
});

cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
