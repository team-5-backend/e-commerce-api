import Joi from "joi";

const objectId = Joi.string().hex().length(24);

export const addCartItemSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).default(1)
});

export const updateCartItemSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).required()
});

export const applyCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .valid("SAVE10", "SAVE20", "SAVE50", "SAVE80", "OFF50")
    .required()
});
