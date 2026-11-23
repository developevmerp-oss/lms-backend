import crypto from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Keeps the Cloudinary storage from filling up: when a record's image / video / document is REPLACED,
 * or the record is DELETED, the old file is deleted from Cloudinary too.
 *
 * Safety rules (a file is never deleted unless all are true):
 *  - it is a Cloudinary file of THIS account that lives in the "lms/" folder (our own uploads only)
 *  - the deletion happens a short time AFTER the change (default 30 s) and only if NO row in the
 *    database still uses that exact URL. This protects flows such as "edit course" that delete and
 *    re-create chapters with the same video, and updates that were rolled back.
 *  - soft-deleted users (paranoid) keep their files, because they can be restored.
 *
 * Turn it off with CLOUDINARY_AUTO_DELETE=false. Nothing here deletes by age: only user actions
 * (replace / delete) trigger it.
 */

// model name -> columns that can hold an uploaded file URL
export const MEDIA_COLUMNS: Record<string, string[]> = {
  User: ['avatarUrl'],
  Course: ['image', 'flyerImage'],
  Chapter: ['videoUrl', 'pdfUrl'],
  Portfolio: ['imageUrl'],
  Reward: ['imageUrl'],
  CommunityWin: ['image'],
  LevelTier: ['thumbnail'],
  Submission: ['fileUrl'],
  LiveClass: ['recordingUrl'],
  Certificate: ['certificateUrl'],
};

const enabled = () => process.env.CLOUDINARY_AUTO_DELETE !== 'false';
const delayMs = () => Number(process.env.MEDIA_CLEANUP_DELAY_MS || 30_000);

type Parsed = { resourceType: 'image' | 'video' | 'raw'; publicId: string };

/** https://res.cloudinary.com/<cloud>/<type>/upload/v123/lms/images/abc.jpg -> { image, lms/images/abc } */
export const parseCloudinaryUrl = (url: unknown): Parsed | null => {
  if (typeof url !== 'string') return null;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(lms\/[^?#]+)$/);
  if (!m || m[1] !== cloud) return null;
  const resourceType = m[2] as Parsed['resourceType'];
  let publicId = decodeURIComponent(m[3]);
  // images/videos: public_id has no extension. raw files (pdf, zip...): the extension IS part of the public_id.
  if (resourceType !== 'raw') publicId = publicId.replace(/\.[A-Za-z0-9]+$/, '');
  return { resourceType, publicId };
};

const destroyOnCloudinary = async (p: Parsed): Promise<string> => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${p.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
    .digest('hex');
  const form = new FormData();
  form.append('public_id', p.publicId);
  form.append('api_key', process.env.CLOUDINARY_API_KEY as string);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${p.resourceType}/destroy`, {
    method: 'POST',
    body: form,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.result as string; // 'ok' | 'not found'
};

/** True if any row in any media column still holds this exact URL. */
const isStillReferenced = async (url: string): Promise<boolean> => {
  for (const [modelName, cols] of Object.entries(MEDIA_COLUMNS)) {
    const model: any = (sequelize.models as any)[modelName];
    if (!model) continue;
    const table = model.tableName;
    for (const col of cols) {
      try {
        const rows = await sequelize.query(`SELECT 1 FROM "${table}" WHERE "${col}" = :url LIMIT 1`, {
          replacements: { url },
          type: QueryTypes.SELECT,
        });
        if (rows.length > 0) return true;
      } catch {
        // table/column missing on this database: it cannot reference the file
      }
    }
  }
  return false;
};

/**
 * Deletes ONE uploaded file right now, e.g. when a user uploads a file in a form and then removes it
 * before saving (no database row ever pointed to it, so no replace/delete event would clean it up).
 * Same safety rules: only our own lms/ files, and never a file that a database row still uses.
 */
export const deleteUnusedMediaNow = async (url: unknown): Promise<'deleted' | 'not_found' | 'in_use' | 'ignored'> => {
  const parsed = parseCloudinaryUrl(url);
  if (!enabled() || !parsed || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return 'ignored';
  if (await isStillReferenced(url as string)) return 'in_use';
  const result = await destroyOnCloudinary(parsed);
  console.log(`[MediaCleanup] unsaved upload removed from Cloudinary (${result}): ${url}`);
  return result === 'ok' ? 'deleted' : 'not_found';
};

/** Queue old file URLs for deletion (after a short delay, only if nothing references them any more). */
export const scheduleMediaCleanup = (urls: Array<unknown>) => {
  if (!enabled() || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return;
  const unique = Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && !!parseCloudinaryUrl(u))));
  if (unique.length === 0) return;

  const timer = setTimeout(async () => {
    for (const url of unique) {
      try {
        if (await isStillReferenced(url)) continue; // still used somewhere: keep it
        const result = await destroyOnCloudinary(parseCloudinaryUrl(url) as Parsed);
        console.log(`[MediaCleanup] deleted from Cloudinary (${result}): ${url}`);
      } catch (err: any) {
        console.warn(`[MediaCleanup] could not delete ${url}: ${err?.message || err}`);
      }
    }
  }, delayMs());
  timer.unref?.();
};

/** Hooks every media model: replace -> old file queued; destroy -> its files queued. */
export const registerMediaCleanupHooks = (models: Record<string, any>) => {
  const pendingOnUpdate = new WeakMap<object, string[]>();

  for (const [modelName, cols] of Object.entries(MEDIA_COLUMNS)) {
    const Model = models[modelName];
    if (!Model || typeof Model.addHook !== 'function') continue;
    const isParanoid = Boolean(Model.options?.paranoid);

    Model.addHook('beforeUpdate', (instance: any) => {
      const old: string[] = [];
      for (const col of cols) {
        if (instance.changed(col)) {
          const before = instance.previous(col);
          if (before && before !== instance.get(col)) old.push(before);
        }
      }
      if (old.length) pendingOnUpdate.set(instance, old);
    });
    Model.addHook('afterUpdate', (instance: any) => {
      const old = pendingOnUpdate.get(instance);
      if (old) {
        pendingOnUpdate.delete(instance);
        scheduleMediaCleanup(old);
      }
    });

    Model.addHook('afterDestroy', (instance: any, options: any) => {
      if (isParanoid && !options?.force) return; // soft delete: row can be restored, keep files
      scheduleMediaCleanup(cols.map((c) => instance.get(c)));
    });

    // Model.destroy({ where }) deletes many rows at once without per-row hooks: read them first
    Model.addHook('beforeBulkDestroy', async (options: any) => {
      if (isParanoid && !options?.force) return;
      if (!enabled()) return;
      try {
        const rows = await Model.findAll({ where: options.where, attributes: cols, raw: true });
        scheduleMediaCleanup(rows.flatMap((r: any) => cols.map((c) => r[c])));
      } catch {
        // never block the real delete because of cleanup bookkeeping
      }
    });
  }
};
