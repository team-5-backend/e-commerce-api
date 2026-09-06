import Joi from 'joi'

const phone = Joi.string()
  .trim()
  .max(14)
  .pattern(new RegExp(/^(002|02|\+2)?01[0-25]\d{8}$/))
  .messages({
    'string.pattern.base': 'invalid phone number, please enter Egyptian number',
  })

export default phone
