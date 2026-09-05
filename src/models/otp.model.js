// import mongoose from 'mongoose';

// const otpSchema = new mongoose.Schema({
//     email: {
//         type: String,
//         required: true,
//         trim: true,
//     },

//     otp: {
//         type: String,
//         required: true,
//     },

//     createdAt: {
//         type: Date,
//         default: Date.now,
//         expires: '5m',
//     },
// });

// export const OTP = mongoose.model('OTP', otpSchema);

////////////////////////////////////////////////////////////////////////

import mongoose from 'mongoose';
import validator from 'validator';
import bcryptjs from 'bcryptjs';
import { MODELCONSTANT } from './../config/constants';

const OTPschema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            validate: {
                validator: (v) => validator.isEmail(v),
                message: 'invalid email',
            },
            required: true,
            trim: true,
            lowercase: true,
        },

        otp: {
            type: String,
            required: true,
            trim: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        userData: {
            type: Object,
            default: null,
        },

        attempts: {
            type: Number,
            default: 0,
        },
    },
    MODELCONSTANT,
);

OTPschema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OTPschema.pre('save', async function () {
    if (!this.isModified('otp')) return;

    const salt = await bcryptjs.genSalt(12);
    this.otp = await bcryptjs.hash(this.otp, salt);
});

export const OTP = mongoose.models.OTP || mongoose.model('OTP', OTPschema);
