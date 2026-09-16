import Joi from 'joi'

const objectIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid ID format',
    'string.length': 'Invalid ID format',
    'any.required': 'ID is required',
  }),
})

export default objectIdSchema
