import Joi from 'joi'

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required().trim(),
        image: Joi.string().trim().required(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),

  shippingAddress: Joi.object({
    fullName: Joi.string().trim().required(),
    phone: Joi.string()
      .trim()
      .pattern(/^(002|02|\+2)?01[0-25]\d{8}$/)
      .required()
      .messages({
        'string.pattern.base': 'invalid phone number, please enter Egyptian number',
      }),
    country: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    address: Joi.string().trim().required(),
    postalCode: Joi.string().trim().required(),
  }).required(),

  paymentMethod: Joi.string().valid('cash', 'stripe', 'paypal', 'paymob').default('cash'),

  customerNote: Joi.string().trim().max(1000),
})
