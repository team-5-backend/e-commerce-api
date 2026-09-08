import dotenv from 'dotenv'

dotenv.config()

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || 'localhost',
  logLevel: process.env.LOG_LEVEL || 'info',
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI,
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
  redisUrl: process.env.REDIS_URL,
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtAccessExp: process.env.JWT_ACCESS_EXP || '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpDays: process.env.JWT_REFRESH_EXP_DAYS || '7d',
  },
}

environment.isProduction = environment.nodeEnv === 'production'
environment.isDevelopment = environment.nodeEnv === 'development'

Object.freeze(environment)

export default environment
