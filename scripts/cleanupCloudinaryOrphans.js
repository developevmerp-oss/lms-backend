/**
 * Finds (and optionally deletes) files in Cloudinary's "lms/" folder that NO database row uses any more.
 * Typical orphans: a file was uploaded in a form but the form was never saved / was cancelled.
 *
 *   node scripts/cleanupCloudinaryOrphans.js                      -> DRY RUN: only lists orphans, deletes nothing
 *   node scripts/cleanupCloudinaryOrphans.js --apply              -> really deletes the orphans listed
 *
 * Options
 *   --older-than-hours=24    only touch files older than this (default 24) so an upload that is still
 *                            being saved is never removed
 *   --extra-db=<url>         ALSO check this database (repeatable, or set EXTRA_DATABASE_URLS=url1,url2).
 *
 * !! IMPORTANT: every database that uses this Cloudinary account must be checked, otherwise files that
 * !! are used by the OTHER database (e.g. production) look like orphans and would be deleted.
 * !! So pass your production URL as --extra-db when your .env points to a local/test database.
 *
 * Needs in .env: DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
require('dotenv').config();
const crypto = require('crypto');
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');
const argValue = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const OLDER_THAN_HOURS = Number(argValue('older-than-hours', 24));
const extraDbs = [
  ...process.argv.filter((a) => a.startsWith('--extra-db=')).map((a) => a.slice('--extra-db='.length)),
  ...(process.env.EXTRA_DATABASE_URLS || '').split(',').map((s) => s.trim()).filter(Boolean),
];

const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
const COLUMNS = [
  ['Users', 'avatarUrl'], ['Courses', 'image'], ['Courses', 'flyerImage'], ['Chapters', 'videoUrl'], ['Chapters', 'pdfUrl'],
  ['Portfolios', 'imageUrl'], ['Rewards', 'imageUrl'], ['CommunityWins', 'image'], ['LevelTiers', 'thumbnail'],
  ['Submissions', 'fileUrl'], ['LiveClasses', 'recordingUrl'], ['Certificates', 'certificateUrl'],
];

const clean = (u) => u.replace(/&channel_binding=[^&]*/g, '').replace(/\?channel_binding=[^&]*&?/g, '?').replace(/\?$/, '');
const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
const api = async (p) => {
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${p}`, { headers: { Authorization: auth } });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error?.message || `HTTP ${r.status}`);
  return json;
};

async function referencedUrls(connectionString) {
  const db = new Client({ connectionString: clean(connectionString), ssl: { rejectUnauthorized: false } });
  await db.connect(); // a connection failure aborts the whole script (never guess "unused")
  const used = new Set();
  for (const [table, col] of COLUMNS) {
    try {
      const { rows } = await db.query(`SELECT "${col}" AS v FROM "${table}" WHERE "${col}" LIKE 'https://res.cloudinary.com/%'`);
      rows.forEach((r) => used.add(r.v));
    } catch (e) {
      if (e.code !== '42P01' && e.code !== '42703') throw e; // only "table/column does not exist" is safe to skip
    }
  }
  const host = (connectionString.match(/@([^:/]+)/) || [])[1];
  await db.end();
  return { host, used };
}

async function destroy(resourceType, publicId) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${secret}`).digest('hex');
  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', key);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/destroy`, { method: 'POST', body: form });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error?.message || `HTTP ${r.status}`);
  return json.result;
}

(async () => {
  if (!cloud || !key || !secret) throw new Error('CLOUDINARY_* variables missing in .env');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

  console.log(APPLY ? '*** APPLY MODE: orphans will be DELETED ***' : '*** DRY RUN (nothing is deleted) ***');
  const used = new Set();
  for (const url of [process.env.DATABASE_URL, ...extraDbs]) {
    const { host, used: set } = await referencedUrls(url);
    set.forEach((u) => used.add(u));
    console.log(`database checked: ${host} (${set.size} Cloudinary files in use)`);
  }
  if (extraDbs.length === 0) {
    console.log('NOTE: only ONE database was checked. If another database (e.g. production) uses this Cloudinary account, add it with --extra-db=<url> before using --apply.');
  }

  const assets = [];
  for (const type of ['image', 'video', 'raw']) {
    let cursor;
    do {
      const r = await api(`resources/${type}/upload?prefix=lms/&max_results=500${cursor ? `&next_cursor=${cursor}` : ''}`);
      (r.resources || []).forEach((a) => assets.push({ type, id: a.public_id, url: a.secure_url, bytes: a.bytes, created: new Date(a.created_at) }));
      cursor = r.next_cursor;
    } while (cursor);
  }

  const cutoff = Date.now() - OLDER_THAN_HOURS * 3600 * 1000;
  const unused = assets.filter((a) => !used.has(a.url));
  const orphans = unused.filter((a) => a.created.getTime() < cutoff);
  const tooNew = unused.length - orphans.length;
  const mb = (n) => (n / 1048576).toFixed(1);

  console.log(`\nFiles in Cloudinary lms/: ${assets.length} (${mb(assets.reduce((s, a) => s + a.bytes, 0))} MB)`);
  console.log(`Used by a database row:   ${assets.length - unused.length}`);
  console.log(`Unused but newer than ${OLDER_THAN_HOURS}h (kept): ${tooNew}`);
  console.log(`ORPHANS (unused, older than ${OLDER_THAN_HOURS}h): ${orphans.length} (${mb(orphans.reduce((s, a) => s + a.bytes, 0))} MB)\n`);
  orphans.sort((a, b) => b.bytes - a.bytes).forEach((a) => console.log(`  ${a.type.padEnd(5)} ${a.id}  ${mb(a.bytes)} MB  ${a.created.toISOString()}`));

  if (!APPLY) { console.log('\nNothing deleted. Run again with --apply to delete the orphans above.'); return; }
  let ok = 0;
  for (const a of orphans) {
    try { const res = await destroy(a.type, a.id); ok += res === 'ok' ? 1 : 0; console.log(`deleted (${res}): ${a.id}`); }
    catch (e) { console.log(`FAIL ${a.id}: ${e.message}`); }
  }
  console.log(`\nDeleted ${ok} of ${orphans.length} orphans.`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
