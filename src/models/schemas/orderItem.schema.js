import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
)

export default orderItemSchema
