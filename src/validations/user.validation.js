import joi from 'joi'

export const createUserSchema = joi.object({
  username: joi.string().required(),

  email: joi.string().email().required(),

  password: joi
    .string()
    .pattern(new RegExp(/^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W){1,}[\w\W\d].{8,25}$/))
    .messages({
      'string.pattern.base':
        'password must contain uppercase, lowercase, special characters and numbers',
    })
    .required(),

  phone: joi
    .string()
    .trim()
    .max(11)
    .pattern(new RegExp(/^(002|02|\+2)?01[0-25]\d{8}$/))
    .messages({
      'string.pattern.base': 'invalid phone number, please enter Egyptian number',
    })
    .optional(),

  avatar: joi.string().uri().optional(),

  addresses: joi
    .array()
    .items(
      joi.object({
        street: joi.string().trim(),
        city: joi.string().trim(),
        state: joi.string().trim(),
        country: joi.string().trim(),
        zipCode: joi.string().trim(),
      }),
    )
    .optional(),

  role: joi.string().valid('admin', 'customer').default('customer').optional(),
})
