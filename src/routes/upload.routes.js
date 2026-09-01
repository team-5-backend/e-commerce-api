import express from 'express';

import upload from '../middlewares/upload.middleware..js';
import { uploadFiles } from '../controllers/upload.controller.js';

const router = express.Router();

router.post('/upload', upload.array('images', 5), uploadFiles);

export default router;

// upload.single('file') عشان لو عايز ارفع ملف واحد
