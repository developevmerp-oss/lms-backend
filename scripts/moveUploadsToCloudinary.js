/**
 * Moves OLD files that are stored as "/uploads/..." paths into Cloudinary and replaces the path in the database
 * with the permanent https URL. Each file is read from this machine's uploads folder first; if it is missing there,
 * it is downloaded from LEGACY_UPLOADS_URL (your old server) when that is set.
 *
 *   node scripts/moveUploadsToCloudinary.js           -> DRY RUN (reports which files can be found)
 *   node scripts/moveUploadsToCloudinary.js --apply   -> upload + update rows
 *
 * Needs in .env: DATABASE_URL, CLOUDINARY_* (and optionally LEGACY_UPLOADS_URL)
 * Files that cannot be found anywhere are reported as MISSING and left untouched.
 */
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');
const LEGACY = (process.env.LEGACY_UPLOADS_URL || '').replace(/\/+$/, '');
const TARGETS = [
  ['Users', 'avatarUrl'], ['Courses', 'image'], ['Courses', 'flyerImage'], ['Chapters', 'videoUrl'],
  ['Chapters', 'pdfUrl'], ['Portfolios', 'imageUrl'], ['Rewards', 'imageUrl'], ['CommunityWins', 'image'],
  ['LevelTiers', 'thumbnail'], ['Submissions', 'fileUrl'],
];
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.pdf': 'application/pdf',
};

const kindFor = (mime) =>
  mime.startsWith('image/') ? ['image', 'lms/images'] : mime.startsWith('video/') ? ['video', 'lms/videos'] : ['raw', 'lms/documents'];

async function getFile(p) {
  const local = path.join(__dirname, '..', p);
  if (fs.existsSync(local)) return { buf: fs.readFileSync(local), from: 'local disk' };
  if (LEGACY) {
    try {
      const r = await fetch(LEGACY + p);
      const type = r.headers.get('content-type') || '';
      if (r.ok && !type.startsWith('text/html')) return { buf: Buffer.from(await r.arrayBuffer()), from: 'old server' };
    } catch (_) {}
  }
  return null;
}

async function upload(buf, mime, name) {
  const [kind, folder] = kindFor(mime);
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${ts}${secret}`).digest('hex');
  const f = new FormData();
  f.append('file', new Blob([buf], { type: mime }), name);
  f.append('api_key', key);
  f.append('timestamp', ts);
  f.append('folder', folder);
  f.append('signature', sig);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`, { method: 'POST', body: f });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.secure_url) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  return j.secure_url;
}

(async () => {
  let url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  url = url.replace(/&channel_binding=[^&]*/g, '').replace(/\?channel_binding=[^&]*&?/g, '?').replace(/\?$/, '');
  if (APPLY && !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
    throw new Error('Set CLOUDINARY_* env vars before using --apply');
  }
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  console.log(APPLY ? '*** APPLY MODE ***' : '*** DRY RUN (no changes) ***', LEGACY ? `(old server: ${LEGACY})` : '(no LEGACY_UPLOADS_URL set)');

  let found = 0, missing = 0, moved = 0;
  for (const [table, col] of TARGETS) {
    let rows;
    try {
      rows = (await db.query(`SELECT id, "${col}" AS v FROM "${table}" WHERE "${col}" LIKE '/uploads/%'`)).rows;
    } catch (_) {
      continue;
    }
    for (const r of rows) {
      const file = await getFile(r.v);
      if (!file) { missing++; console.log(`  MISSING ${table}.${col} ${r.v}`); continue; }
      found++;
      console.log(`  found   ${table}.${col} ${r.v} (${file.from}, ${(file.buf.length / 1024).toFixed(0)} KB)`);
      if (!APPLY) continue;
      try {
        const mime = MIME[path.extname(r.v).toLowerCase()] || 'application/octet-stream';
        const newUrl = await upload(file.buf, mime, path.basename(r.v));
        await db.query(`UPDATE "${table}" SET "${col}" = $1 WHERE id = $2`, [newUrl, r.id]);
        moved++;
        console.log(`     -> ${newUrl}`);
      } catch (e) {
        console.log(`     FAILED: ${e.message}`);
      }
    }
  }
  console.log(`\nfound: ${found}, missing: ${missing}${APPLY ? `, moved to Cloudinary: ${moved}` : ''}`);
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
