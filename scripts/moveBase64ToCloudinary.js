/**
 * One-off cleanup: moves base64 files that are ALREADY stored in the database to Cloudinary
 * and replaces the column value with the short https URL, then you VACUUM to shrink the DB.
 *
 *   node scripts/moveBase64ToCloudinary.js            -> DRY RUN (only reports sizes, changes nothing)
 *   node scripts/moveBase64ToCloudinary.js --apply    -> really upload + update rows
 *
 * Needs in .env: DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Take a backup (Neon: create a branch) before using --apply.
 */
require('dotenv').config();
const crypto = require('crypto');
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

const TARGETS = [
  ['Users', 'avatarUrl'],
  ['Courses', 'image'],
  ['Courses', 'flyerImage'],
  ['Chapters', 'videoUrl'],
  ['Chapters', 'pdfUrl'],
  ['Portfolios', 'imageUrl'],
  ['Rewards', 'imageUrl'],
  ['CommunityWins', 'image'],
  ['LevelTiers', 'thumbnail'],
  ['Submissions', 'fileUrl'],
];

const kindOf = (mime) => {
  if (mime === 'image/svg+xml') return null;
  if (mime.startsWith('image/')) return { kind: 'image', folder: 'lms/images' };
  if (mime.startsWith('video/')) return { kind: 'video', folder: 'lms/videos' };
  if (mime === 'application/pdf') return { kind: 'raw', folder: 'lms/documents' };
  return null;
};

async function upload(dataUrl, kind, folder) {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('api_key', key);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json.secure_url;
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
  console.log(APPLY ? '*** APPLY MODE ***' : '*** DRY RUN (no changes) ***');

  let totalBytes = 0;
  for (const [table, col] of TARGETS) {
    let rows;
    try {
      // length() only -> the base64 itself is not downloaded during the dry run
      rows = (await db.query(`SELECT id, length("${col}") AS len FROM "${table}" WHERE "${col}" LIKE 'data:%'`)).rows;
    } catch (e) {
      console.log(`- ${table}.${col}: skipped (${e.message})`);
      continue;
    }
    const bytes = rows.reduce((s, r) => s + Number(r.len), 0);
    totalBytes += bytes;
    console.log(`- ${table}.${col}: ${rows.length} base64 rows, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
    if (!APPLY) continue;

    for (const r of rows) {
      const { rows: [row] } = await db.query(`SELECT "${col}" AS v FROM "${table}" WHERE id = $1`, [r.id]);
      const mime = (row.v.match(/^data:([^;,]+)/) || [])[1] || '';
      const k = kindOf(mime.toLowerCase());
      if (!k) { console.log(`   skip ${r.id} (${mime})`); continue; }
      try {
        const newUrl = await upload(row.v, k.kind, k.folder);
        await db.query(`UPDATE "${table}" SET "${col}" = $1 WHERE id = $2`, [newUrl, r.id]);
        console.log(`   ok   ${table}.${col} ${r.id} -> ${newUrl}`);
      } catch (e) {
        console.log(`   FAIL ${table}.${col} ${r.id}: ${e.message}`);
      }
    }
  }

  console.log(`\nTotal base64 stored in DB: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  if (APPLY) console.log('Now run:  VACUUM FULL "Courses"; VACUUM FULL "Users"; VACUUM FULL "Chapters"; (etc.) to give the space back.');
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
