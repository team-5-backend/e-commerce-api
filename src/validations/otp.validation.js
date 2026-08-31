import Joi from 'joi';

const generateOtpValidate = Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
});

const verifyOtpValidate = Joi.object({
    email: Joi.string().email().required().lowercase().trim(),

    otp: Joi.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required(),
});

module.exports = {
    generateOtpValidate,
    verifyOtpValidate,
};
