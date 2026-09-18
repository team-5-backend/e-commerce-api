import { isValidPhoneNumber } from 'libphonenumber-js/min'

const phoneSchema = {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: (v) => {
      if (!v || typeof v !== 'string') return false

      const value = v.trim()

      const egyptianLocalRegex = /^01[0125]\d{8}$/

      const egyptianInternationalRegex = /^\+201[0125]\d{8}$/

      if (egyptianLocalRegex.test(value) || egyptianInternationalRegex.test(value)) {
        return true
      }

      return isValidPhoneNumber(value)
    },
    message: (props) =>
      `${props.value} is invalid. Egyptian local numbers must be 11 digits (01XXXXXXXXX) and international must be +20XXXXXXXXXX.`,
  },
}

export default phoneSchema
