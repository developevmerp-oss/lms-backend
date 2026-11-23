import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { offloadLocalFile } from '../middleware/offloadDataUrls';
import { authenticate } from '../middleware/auth.middleware';
import { deleteUnusedMediaNow } from '../utils/cloudinaryCleanup';

/**
 * Upload endpoints (multipart/form-data). When CLOUDINARY_* is configured every file is pushed to
 * Cloudinary and the https URL is returned; otherwise the file stays on the server disk (/uploads/...).
 *
 *   POST /api/upload/image     -> images only          (form field "file" or "image")
 *   POST /api/upload/video     -> videos (and, for older clients, any file)  (field "video" or "file")
 *   POST /api/upload/document  -> pdf / office / text / zip   (field "file", "document" or "pdf")
 *   POST /api/upload/pdf       -> kept for older clients (field "pdf")
 */
const router = Router();

const ensureDir = (name: string) => {
  const dir = path.join(process.cwd(), 'uploads', name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const makeStorage = (folder: string, prefix: string, fallbackExt: string) =>
  multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, ensureDir(folder)),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname) || fallbackExt;
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  });

const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.rar'];

// ── Typed uploaders ──
const imageUploader = multer({
  storage: makeStorage('images', 'image', '.png'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const ok = file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml';
    cb(ok ? null : new Error('Only image files (PNG, JPG, WEBP, GIF) are allowed on this route'), ok);
  },
}).fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]);

const documentUploader = multer({
  storage: makeStorage('documents', 'doc', '.pdf'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req: any, file: any, cb: any) => {
    const ok = DOC_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error(`Only document files (${DOC_EXTENSIONS.join(', ')}) are allowed on this route`), ok);
  },
}).fields([{ name: 'file', maxCount: 1 }, { name: 'document', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]);

// Video route keeps accepting any file type so older frontends (which send every file here) keep working.
const videoUploader = multer({
  storage: makeStorage('videos', 'video', '.mp4'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
}).fields([{ name: 'video', maxCount: 1 }, { name: 'file', maxCount: 1 }]);

// Older PDF route (field "pdf")
const pdfUploader = multer({
  storage: makeStorage('documents', 'doc', '.pdf'),
  limits: { fileSize: 100 * 1024 * 1024 },
}).single('pdf');

// Runs a multer middleware and turns its errors into a clean JSON 400
const run = (uploader: any) => (req: any, res: any, next: any) =>
  uploader(req, res, (err: any) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });

const firstFile = (req: any): any => {
  if (req.file) return req.file;
  const groups = req.files ? Object.values(req.files as Record<string, any[]>) : [];
  return groups.length ? (groups[0] as any[])[0] : undefined;
};

const respond = (folder: string, label: string, defaultMime: string) => async (req: any, res: any) => {
  try {
    const file = firstFile(req);
    if (!file) return res.status(400).json({ message: `No ${label.toLowerCase()} file provided` });

    const info: { error?: string } = {};
    const remoteUrl = await offloadLocalFile(file.path, file.mimetype || defaultMime, info);
    return res.status(200).json({
      success: true,
      url: remoteUrl || `/uploads/${folder}/${file.filename}`,
      // 'cloudinary' = permanent link, 'local' = saved on THIS server's disk (Cloudinary keys missing or upload failed)
      storage: remoteUrl ? 'cloudinary' : 'local',
      // Only present when the file stayed local: tells you exactly why Cloudinary was not used
      ...(remoteUrl ? {} : { storageError: info.error }),
      message: `${label} uploaded successfully`,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || `${label} upload failed` });
  }
};

// DELETE /api/upload  body: { "url": "<cloudinary link>" }
// Used by the forms when someone uploads a file and then removes / replaces it BEFORE saving, so the
// unsaved file does not stay in Cloudinary. Never deletes a file that a database row still uses.
router.delete('/', authenticate, async (req: any, res: any) => {
  try {
    const url = req.body?.url || req.query?.url;
    if (!url) return res.status(400).json({ message: 'url is required' });
    const result = await deleteUnusedMediaNow(url);
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Could not delete the file' });
  }
});

router.post('/image', run(imageUploader), respond('images', 'Image', 'image/png'));
router.post('/video', run(videoUploader), respond('videos', 'Video', 'application/octet-stream'));
router.post('/document', run(documentUploader), respond('documents', 'Document', 'application/pdf'));
router.post('/pdf', run(pdfUploader), respond('documents', 'PDF', 'application/pdf'));

export default router;
