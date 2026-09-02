import { v2 as cloudinary } from 'cloudinary'

export const uploadImages = async (fileBuffers) => {
  const uploadPromises = fileBuffers.map((buffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'my_app_uploads' },
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
    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload images to Cloudinary')
  }
}

export const deleteImages = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) return

  try {
    return await cloudinary.api.delete_resources(publicIds)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error('Failed to delete images from Cloudinary')
  }
}
