import { uploadImages } from '../utils/upload.js';

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded',
            });
        }

        const [image] = await uploadImages([req.file.buffer]);

        return res.status(200).json({
            message: 'File uploaded successfully',
            image,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Failed to upload file',
        });
    }
};
