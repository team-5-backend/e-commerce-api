import Joi from 'joi'

export const createProductSchema = Joi.object({
  name: Joi.string().max(200).trim().required(),

  shortDescription: Joi.string().max(500).trim().required(),

  description: Joi.string().trim().required(),

  price: Joi.number().min(0).required(),

  discountPrice: Joi.number()
    .min(0)
    .default(0)
    .max(Joi.ref('price'))
    .messages({
      'number.max':
        'Discount price must be lower than or equal to original price',
    }),

  stock: Joi.number().integer().min(0).required(),

  sku: Joi.string().trim().max(100),

  category: Joi.string().trim().lowercase().required(),

  subcategory: Joi.string().trim().lowercase(),

  brand: Joi.string().trim().max(100),

  tags: Joi.alternatives().try(
    Joi.array()
      .items(Joi.string().trim().lowercase().max(50))
      .max(20),

    Joi.string()
      .trim()
      .lowercase()
      .custom((value) =>
        value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
  ),

  featured: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
}).unknown(false)

export const updateProductSchema = createProductSchema
  .fork(
    Object.keys(createProductSchema.describe().keys),
    (schema) => schema.optional().prefs({ noDefaults: true }),
  )
  .keys({
    deleteImageIds: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(255)).max(5),
      Joi.string().trim(),
    ),
  })
  .min(1)
  .unknown(false)

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  category: Joi.string().trim().lowercase(),

  brand: Joi.string().trim(),

  minPrice: Joi.number().min(0),

  maxPrice: Joi.number().min(0),

  sort: Joi.string().valid(
    'price-asc',
    'price-desc',
    'rating',
    'newest',
  ),
})
  .custom((value, helpers) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      return helpers.error('any.invalid')
    }

    return value
  })
  .messages({
    'any.invalid': 'minPrice cannot be greater than maxPrice',
  })

export const searchProductSchema = Joi.object({
  q: Joi.string().trim().min(1).max(100),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  category: Joi.string().trim().lowercase(),

  subcategory: Joi.string().trim().lowercase(),

  brand: Joi.string().trim(),

  tags: Joi.string().trim(),

  minPrice: Joi.number().min(0),

  maxPrice: Joi.number().min(0),
})
  .custom((value, helpers) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      return helpers.error('any.invalid')
    }

    return value
  })
  .messages({
    'any.invalid': 'minPrice cannot be greater than maxPrice',
  })

export const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),

  comment: Joi.string().trim().min(1).max(1000).required(),
}).unknown(false)