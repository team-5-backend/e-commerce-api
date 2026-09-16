import dotenv from 'dotenv'

dotenv.config()

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || 'localhost',
  logLevel: process.env.LOG_LEVEL || 'info',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],
  mongoUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL,
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtAccessExp: process.env.JWT_ACCESS_EXP || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpDays: parseInt(process.env.JWT_REFRESH_EXP_DAYS, 10) || 7,
  },
  otpTtl: parseInt(process.env.OTP_TTL, 10) || 5 * 60, // 5m
  corsMaxAge: parseInt(process.env.CORS_MAX_AGE, 10) || 60 * 60 * 24, // 1d
  cloudinary: {
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  brevo: {
    brevoApiKey: process.env.BREVO_API_KEY,
    senderName: process.env.BREVO_SENDER_NAME,
    senderEmail: process.env.BREVO_SENDER_EMAIL,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
  },
  paymob: {
    paymobId: process.env.PAYMOB_INTEGRATION_ID,
    paymobApiKey: process.env.PAYMOB_API_KEY,
    hmacSecret: process.env.PAYMOB_HMAC_SECRET,
  },
  checkout: {
    freeShippingThreshold: parseInt(process.env.FREE_SHIPPING_THRESHOLD, 10) || 1000,
    shippingFee: parseInt(process.env.SHIPPING_FEE, 10) || 50,
    taxRate: parseFloat(process.env.TAX_RATE) || 0.14,
  },
}

environment.isProduction = environment.nodeEnv === 'production'
environment.isDevelopment = environment.nodeEnv === 'development'

Object.freeze(environment)

export default environment
