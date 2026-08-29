import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

import validator from 'validator'
// sub schema address
const addressSchema = new mongoose.Schema(
        {
            street: String,
            city: String,
            state: String,
            country: String,
            zipCode: String,
        },
        { _id: false }
        )

    const userSchema = new mongoose.Schema(
    {
        username: {
        type: String,
        required: true,
        trim: true,
        },

        email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: 'Invalid email',
        },
        },

        password: {
        type: String,
        required: true,
        select: false,
        validate:{
            validator: (value) => /^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W){1,}[\w\W\d].{8,25}$/.test(value),
                message: 'Invalid Weak Password ',
        }
        },

        phone: {
        type: String,
        validate: {
                validator: (value) => /^(002|02|\+2)?01[0-25]\d{8}$/.test(value),
                message: 'Invalid Egyptian phone number',
            },
        },

        avatar: {
        type: String,
        default: 'https://www.instagram.com/p/DRPmieLCGo2/',
        },

        role: {
        type: String,
        trim: true,
        enum: ['admin', 'customer'],
        default: 'customer',
        },

        addresses: {
        type: [addressSchema],
        default: [],
        },
        wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        ],

        isVerified: {
        type: Boolean,
        default: false,
        },

        resetPasswordToken: {
        type: String,
        },

        resetPasswordExpire: {
        type: Date,
        },
    },
    {
        timestamps:true ,
        strict:true ,
        strictQuery:true ,
        toJSON:{virtuals:true} ,
        toObject:{virtuals:true}
    },
    )

    userSchema.pre('save', async function (next) {
            if (!this.isModified('password')) {
                return next()
            }

            const salt = await bcrypt.genSalt(10)

            this.password = await bcrypt.hash(this.password, salt)

            next()
    })

    userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password)
    }
    export const User = mongoose.model('User', userSchema)
