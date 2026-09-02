import { uploadImages } from '../utils/upload.js'

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No pictures uploaded',
      })
    }

    const images = await uploadImages(req.files.map((file) => file.buffer))

    // const [image] = await uploadImages(req.file.buffer); // لو عايز ارفع ملف واحد

    return res.status(200).json({
      message: 'Pictures uploaded successfully',
      images,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Failed to upload pictures',
    })
  }
}
