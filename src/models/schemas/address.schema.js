import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema(
  {
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
)

export default addressSchema
