import joi from 'joi'

export const createUserSchema = joi.object({
  username: joi.string().required(),

  email: joi.string().email().required(),

  password: joi
    .string()
    .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,25}$/))
    .messages({
      'string.pattern.base':
        'password must contain uppercase, lowercase, special characters and numbers',
    })
    .required(),

  phone: joi
    .string()
    .trim()
    .max(14)
    .pattern(new RegExp(/^(002|02|\+2)?01[0-25]\d{8}$/))
    .messages({
      'string.pattern.base': 'invalid phone number, please enter Egyptian number',
    }),

  avatar: joi.string().uri().optional(),

  addresses: joi.object({
    fullName: joi.string().trim().required(),
    phone: joi
      .string()
      .trim()
      .pattern(/^(002|02|\+2)?01[0-25]\d{8}$/)
      .required(),
    country: joi.string().trim().required(),
    city: joi.string().trim().required(),
    address: joi.string().trim().required(),
    postalCode: joi.string().trim().required(),
  }),

  role: joi.string().valid('admin', 'customer').default('customer').optional(),
})
