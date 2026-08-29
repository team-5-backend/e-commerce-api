import Joi from "joi";

const objectId = Joi.string().hex().length(24);

export const createProductSchema = Joi.object({
  name: Joi.string().max(200).trim().required(),

  shortDescription: Joi.string().max(500).trim().required(),

  description: Joi.string().trim().required(),

  price: Joi.number().min(0).required(),

  discountPrice: Joi.number().min(0).default(0),

  stock: Joi.number().required(),

  sku: Joi.string().trim().optional(),

  category: Joi.string().trim().lowercase().required(),

  subcategory: Joi.string().trim().optional(),

  brand: Joi.string().trim().optional(),

  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ).optional(),

  featured: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),

  createdBy: objectId.required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().max(200).trim(),

  shortDescription: Joi.string().max(500).trim(),

  description: Joi.string().trim(),

  price: Joi.number().min(0),

  discountPrice: Joi.number().min(0),

  stock: Joi.number(),

  sku: Joi.string().trim(),

  category: Joi.string().trim().lowercase(),

  subcategory: Joi.string().trim(),

  brand: Joi.string().trim(),

  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ),

  featured: Joi.boolean(),

  isActive: Joi.boolean(),
})
  .min(1)
  .unknown(false);