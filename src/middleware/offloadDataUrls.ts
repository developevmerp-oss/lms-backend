import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Stops base64 files (images / PDFs / videos) from being saved INSIDE the database.
 *
 * Problem: the admin + student UI reads files with FileReader.readAsDataURL() and sends
 * the whole base64 string in the JSON body. It was saved into TEXT columns
 * (Courses.image, Courses.flyerImage, Users.avatarUrl, Chapters.videoUrl, ...).
 * Every later query then pulls those megabytes back out of Postgres, which burns both the
 * database storage AND the monthly network-transfer quota of the free plan.
 *
 * This middleware runs on every write request. If any string in the JSON body is a large
 * `data:` URL it uploads the file to Cloudinary and swaps the string for the short https URL
 * before the controller ever sees it. Controllers and frontend need no change.
 *
 * It is a NO-OP until these env vars are set (so nothing changes until you opt in):
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const MIN_DATA_URL_LENGTH = 20_000; // ~15 KB. Tiny inline icons are left alone.
const MAX_DEPTH = 6;

const cloudName = () => process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = () => process.env.CLOUDINARY_API_KEY;
const apiSecret = () => process.env.CLOUDINARY_API_SECRET;

export const isMediaOffloadConfigured = () => Boolean(cloudName() && apiKey() && apiSecret());

type Kind = 'image' | 'video' | 'raw';

const detectKind = (mime: string): { kind: Kind; folder: string } | null => {
  const m = mime.toLowerCase();
  // SVG is skipped on purpose: it can contain scripts.
  if (m === 'image/svg+xml') return null;
  if (m.startsWith('image/')) return { kind: 'image', folder: 'lms/images' };
  if (m.startsWith('video/')) return { kind: 'video', folder: 'lms/videos' };
  if (m === 'application/pdf') return { kind: 'raw', folder: 'lms/documents' };
  return null;
};

const uploadToCloudinary = async (dataUrl: string, kind: Kind, folder: string): Promise<string> => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // Signature = sha1("folder=...&timestamp=..." + api_secret) (params sorted alphabetically)
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret()}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', dataUrl);
  form.append('api_key', apiKey() as string);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName()}/${kind}/upload`, {
    method: 'POST',
    body: form,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || `Cloudinary upload failed (${res.status})`);
  }
  return json.secure_url as string;
};

const walk = async (node: any, depth: number): Promise<any> => {
  if (depth > MAX_DEPTH || node === null || node === undefined) return node;

  if (typeof node === 'string') {
    if (node.length < MIN_DATA_URL_LENGTH || !node.startsWith('data:')) return node;
    const mime = node.slice(5, node.indexOf(';') > 0 ? node.indexOf(';') : 40);
    const detected = detectKind(mime);
    if (!detected) return node;
    try {
      return await uploadToCloudinary(node, detected.kind, detected.folder);
    } catch (err: any) {
      // Never silently fall back to saving base64 in the DB: that is the bug we are fixing.
      throw new Error(`Media upload failed: ${err?.message || err}`);
    }
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = await walk(node[i], depth + 1);
    return node;
  }

  if (typeof node === 'object') {
    for (const key of Object.keys(node)) node[key] = await walk(node[key], depth + 1);
    return node;
  }

  return node;
};

export const offloadDataUrls = async (req: Request, res: Response, next: NextFunction) => {
  if (!isMediaOffloadConfigured()) return next();
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  if (!req.body || typeof req.body !== 'object') return next();

  try {
    req.body = await walk(req.body, 0);
    return next();
  } catch (err: any) {
    return res.status(502).json({ message: err?.message || 'Media upload failed' });
  }
};

/**
 * For files uploaded with multipart/form-data (multer saves them to the server disk first).
 * Render's free disk is wiped on every restart, so when Cloudinary is configured the file is
 * pushed there, the local copy is deleted, and the https URL is returned.
 * Returns null when Cloudinary is not configured or the upload fails -> caller keeps the local path.
 */
export const offloadLocalFile = async (
  filePath: string,
  mime: string,
  info: { error?: string } = {}
): Promise<string | null> => {
  if (!isMediaOffloadConfigured()) {
    info.error = 'CLOUDINARY_* variables are missing in lms-backend/.env (or the backend was not restarted / is started from another folder)';
    return null;
  }
  const fs = await import('fs');
  try {
    let kind: Kind = 'raw';
    let folder = 'lms/documents';
    if (mime.startsWith('image/') && mime !== 'image/svg+xml') { kind = 'image'; folder = 'lms/images'; }
    else if (mime.startsWith('video/')) { kind = 'video'; folder = 'lms/videos'; }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret()}`)
      .digest('hex');

    const form = new FormData();
    // fs.openAsBlob only exists on Node >= 19.8 (streams from disk). On Node 18 it is undefined, which used to
    // make every upload silently fall back to local disk, so read the file into a Blob instead.
    const blob: Blob =
      typeof (fs as any).openAsBlob === 'function'
        ? await (fs as any).openAsBlob(filePath, { type: mime })
        : new Blob([await fs.promises.readFile(filePath)], { type: mime });
    form.append('file', blob, filePath.split(/[\\/]/).pop());
    form.append('api_key', apiKey() as string);
    form.append('timestamp', timestamp);
    form.append('folder', folder);
    form.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName()}/${kind}/upload`, {
      method: 'POST',
      body: form,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json.secure_url) {
      throw new Error(json?.error?.message || `Cloudinary upload failed (${res.status})`);
    }
    fs.unlink(filePath, () => {});
    return json.secure_url as string;
  } catch (err: any) {
    info.error = err?.message || String(err);
    console.warn('[Upload] Cloudinary offload failed, keeping local file:', info.error);
    return null;
  }
};
