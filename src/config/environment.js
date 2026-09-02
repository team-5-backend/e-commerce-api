import 'dotenv/config'

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || 'localhost',
  logLevel: process.env.LOG_LEVEL || 'info',
  mongoUri: process.env.MONGODB_URI,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  allowedOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
}

environment.isProduction = environment.nodeEnv === 'production'
environment.isDevelopment = environment.nodeEnv === 'development'

Object.freeze(environment)

export default environment
