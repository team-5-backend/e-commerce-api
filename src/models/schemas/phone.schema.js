import { isValidPhoneNumber } from 'libphonenumber-js/min'
import mongoose from 'mongoose'

const phoneSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => isValidPhoneNumber(value),
        message: (props) => `${props.value} is not a valid international phone number!`,
      },
    },
  },
  { _id: false },
)

export default phoneSchema
