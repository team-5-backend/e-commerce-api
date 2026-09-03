import joi from 'joi'

export const createOrderSchema = joi.object({
  items: joi
    .array()
    .items(
      joi.object({
        name: joi.string().required().trim(),
        image: joi.string().trim().required(),
        price: joi.number().min(0).required(),
        quantity: joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),

  shippingAddress: joi
    .object({
      fullName: joi.string().trim().required(),
      phone: joi
        .string()
        .trim()
        .pattern(/^(002|02|\+2)?01[0-25]\d{8}$/)
        .required()
        .messages({
          'string.pattern.base': 'invalid phone number, please enter Egyptian number',
        }),
      country: joi.string().trim().required(),
      city: joi.string().trim().required(),
      address: joi.string().trim().required(),
      postalCode: joi.string().trim().required(),
    })
    .required(),

  paymentMethod: joi.string().valid('cash', 'stripe', 'paypal', 'paymob').default('cash'),

  customerNote: joi.string().trim().max(1000),
})
