import Joi from 'joi'

export const createUserSchema = Joi.object({
  username: Joi.string().required(),

  email: Joi.string().email().required(),

  password: Joi.string()
    .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,25}$/))
    .messages({
      'string.pattern.base':
        'password must contain uppercase, lowercase, special characters and numbers',
    })
    .required(),

  phone: Joi.string()
    .trim()
    // .max(11)
    .max(14)
    .pattern(new RegExp(/^(002|02|\+2)?01[0-25]\d{8}$/))
    .messages({
      'string.pattern.base': 'invalid phone number, please enter Egyptian number',
    }),

  avatar: Joi.string().uri().optional(),

  addresses: Joi.array().items(
    Joi.object({
      fullName: Joi.string().trim().required(),
      phone: Joi.string()
        .trim()
        .pattern(/^(002|02|\+2)?01[0-25]\d{8}$/)
        .required(),
      country: Joi.string().trim().required(),
      city: Joi.string().trim().required(),
      address: Joi.string().trim().required(),
      postalCode: Joi.string().trim().required(),
    }),
  ),

  role: Joi.string().valid('admin', 'customer').default('customer'),
})
