// export const Constants = {
//   HTTP_STATUS: {
//     OK: 200,
//     CREATED: 201,
//     BAD_REQUEST: 400,
//     UNAUTHORIZED: 401,
//     FORBIDDEN: 403,
//     NOT_FOUND: 404,
//     CONFLICT: 409,
//     INTERNAL_ERROR: 500,
//   },
// }

// src/config/constants.js

export const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,

    INTERNAL_SERVER_ERROR: 500,
});

export const MODELCONSTANT = Object.freeze({
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

export const STATIC_COUPONS = {
    SAVE10: { discountType: 'percentage', discountValue: 10 },
    SAVE20: { discountType: 'percentage', discountValue: 20 },
    SAVE50: { discountType: 'percentage', discountValue: 50 },
    SAVE80: { discountType: 'percentage', discountValue: 80 },
    OFF50: { discountType: 'fixed', discountValue: 50 },
};
