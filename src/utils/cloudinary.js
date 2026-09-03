import { v2 as cloudinary } from 'cloudinary'

import environment from '../config/environment.js'

cloudinary.config({
  cloud_name: environment.cloudinary.cloudinaryCloudName,
  api_key: environment.cloudinary.cloudinaryApiKey,
  api_secret: environment.cloudinary.cloudinaryApiSecret,
  secure: true,
})

export const uploadImages = async (fileBuffers, folderName = 'my_app_uploads') => {
  if (!fileBuffers || !Array.isArray(fileBuffers) || fileBuffers.length === 0) {
    return null
  }

  const uploadPromises = fileBuffers.map((buffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error)
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          })
        },
      )
      stream.end(buffer)
    })
  })

  try {
    const results = await Promise.all(uploadPromises)
    logger.info({ message: 'Images uploaded successfully to Cloudinary', count: results.length })
    return results
  } catch (error) {
    logger.error({ message: 'Cloudinary upload error:', error })
    throw new Error('Failed to upload images to Cloudinary')
  }
}

export const deleteImages = async (publicIds) => {
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    return null
  }

  try {
    const result = await cloudinary.api.delete_resources(publicIds)
    logger.info({ message: 'Images deleted from Cloudinary', publicIds })
    return result
  } catch (error) {
    logger.error({ message: 'Cloudinary delete error:', error })
    throw new Error('Failed to delete images from Cloudinary')
  }
}
