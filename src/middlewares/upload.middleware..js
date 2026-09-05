import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Only images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter,
});

export default upload;
