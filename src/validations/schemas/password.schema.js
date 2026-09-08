import Joi from 'joi'

const passwordSchema = Joi.string()
  .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,26}$/))
  .messages({
    'string.pattern.base':
      'password must contain uppercase, lowercase, special characters and numbers',
  }).required()

export default passwordSchema
