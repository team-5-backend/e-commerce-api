import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: (value) => /^(002|02|\+2)?01[0-25]\d{8}$/.test(value),
        message: 'invalid phone number, please enter Egyptian number',
      },
      trim: true,
    },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
)

export default addressSchema
