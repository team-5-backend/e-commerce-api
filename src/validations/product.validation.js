import Joi from 'joi'

export const createProductSchema = Joi.object({
  name: Joi.string().max(200).trim().required(),

  shortDescription: Joi.string().max(500).trim().required(),

  description: Joi.string().trim().required(),

  price: Joi.number().min(0).required(),

  discountPrice: Joi.number()
    .min(0)
    .default(0)
    .when('price', {
      is: Joi.exist(),
      // eslint-disable-next-line unicorn/no-thenable
      then: Joi.number().max(Joi.ref('price')).messages({
        'number.max': 'Discount price must be lower than or equal to original price',
      }),
    }),

  stock: Joi.number().required().min(0),

  sku: Joi.string().trim(),

  category: Joi.string().trim().lowercase().required(),

  subcategory: Joi.string().lowercase().trim(),

  brand: Joi.string().trim(),

  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().lowercase()),
    Joi.string()
      .trim()
      .lowercase()
      .custom((val) => [val]),
  ),

  featured: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),

  images: Joi.array()
    .items(
      Joi.object({
        public_id: Joi.string().trim().required(),
        url: Joi.string().uri().trim().required(),
      }),
    )
    .min(1)
    .required(),
})

export const updateProductSchema = createProductSchema
  .fork(Object.keys(createProductSchema.describe().keys), (schema) =>
    schema.optional().prefs({ noDefaults: true }),
  )
  .min(1)
  .unknown(false)
