import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const getUploadsDir = () => {
  const dir = path.join(process.cwd(), 'uploads/videos');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, getUploadsDir());
  },
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

// Direct Multipart Video Upload Endpoint
router.post('/video', upload.single('video'), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const relativePath = `/uploads/videos/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      url: relativePath,
      message: 'Video uploaded successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Video upload failed' });
  }
});

export default router;
