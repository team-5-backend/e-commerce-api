import Joi from 'joi'

export const addCartItemSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().trim().hex().length(24).required().messages({
          'string.base': 'Invalid Product ID format',
          'string.hex': 'Invalid Product ID format',
          'string.length': 'Invalid Product ID format',
          'any.required': 'Product ID is required',
        }),
        quantity: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),
})

/////////////////////////////////////////

export const updateCartItemSchema = addCartItemSchema

/////////////////////////////////////////

export const applyCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .valid('SAVE10', 'SAVE20', 'SAVE50', 'SAVE80', 'OFF50')
    .required(),
})
