import Joi from 'joi'

const objectId = Joi.string().hex().length(24)

export const createProductSchema = Joi.object({
  name: Joi.string().max(200).trim().required(),

  shortDescription: Joi.string().max(500).trim().required(),

  description: Joi.string().trim().required(),

  price: Joi.number().min(0).required(),

  discountPrice: Joi.number()
    .min(0)
    .when('price', {
      is: Joi.exist(),
      then: Joi.number().less(Joi.ref('price')),
    })
    .default(0)
    .messages({ 'number.less': 'Discount price must be lower than original price' }),

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
