import joi from 'joi'

export const createOrderSchema = joi.object({
  user: joi.string().hex().length(24).required().messages({
    'string.length': 'user must be a valid ObjectId',
  }),

  items: joi
    .array()
    .items(
      joi.object({
        name: joi.string().required(),
        image: joi.string().uri().optional(),
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

  paymentMethod: joi
    .string()
    .valid('cash', 'stripe', 'paypal', 'paymob')
    .default('cash')
    .optional(),

  paymentStatus: joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),

  transactionId: joi.string().optional(),

  subtotal: joi.number().min(0).required(),

  shippingFee: joi.number().min(0).optional(),

  tax: joi.number().min(0).optional(),

  discount: joi.number().min(0).optional(),

  totalPrice: joi.number().min(0).required(),

  status: joi
    .string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
    .optional(),

  paidAt: joi.date().optional(),

  deliveredAt: joi.date().optional(),

  cancelledAt: joi.date().optional(),

  customerNote: joi.string().max(1000).optional(),

  adminNote: joi.string().max(1000).optional(),
})
