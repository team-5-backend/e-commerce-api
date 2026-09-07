import multer from 'multer'

import { AppError } from '../utils/appError'

const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new AppError('Invalid file type! Only images are allowed.', HTTP_STATUS.BAD_REQUEST), false)
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
})

export default upload
