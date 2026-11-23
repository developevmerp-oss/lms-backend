/**
 * Production Media Migration Script: Base64 / Local -> Cloudinary
 * 
 * Usage on Live Server (Render / Production / Local):
 *   node scripts/migrateProductionToCloudinary.js                           (Uses DATABASE_URL from .env or environment)
 *   node scripts/migrateProductionToCloudinary.js "postgresql://..."      (Pass live production DB URL directly)
 *   node scripts/migrateProductionToCloudinary.js --dry-run                (Scan and report sizes without modifying)
 *   node scripts/migrateProductionToCloudinary.js "postgresql://..." --dry-run
 */

require('dotenv').config();
const crypto = require('crypto');
const { Client } = require('pg');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const customDbUrlArg = args.find(a => a.startsWith('postgres://') || a.startsWith('postgresql://'));

const TARGET_COLUMNS = [
  { table: 'Courses', column: 'image', kind: 'image', folder: 'lms/courses' },
  { table: 'Courses', column: 'flyerImage', kind: 'image', folder: 'lms/flyers' },
  { table: 'LevelTiers', column: 'thumbnail', kind: 'image', folder: 'lms/levels' },
  { table: 'Users', column: 'avatarUrl', kind: 'image', folder: 'lms/avatars' },
  { table: 'Rewards', column: 'imageUrl', kind: 'image', folder: 'lms/rewards' },
  { table: 'Portfolios', column: 'imageUrl', kind: 'image', folder: 'lms/portfolios' },
  { table: 'CommunityWins', column: 'image', kind: 'image', folder: 'lms/community' },
  { table: 'Chapters', column: 'videoUrl', kind: 'video', folder: 'lms/videos' },
  { table: 'Chapters', column: 'pdfUrl', kind: 'raw', folder: 'lms/documents' },
  { table: 'Submissions', column: 'fileUrl', kind: 'raw', folder: 'lms/submissions' },
];

function detectKind(mime) {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return { kind: 'image', defaultFolder: 'lms/images' };
  if (m.startsWith('video/')) return { kind: 'video', defaultFolder: 'lms/videos' };
  if (m === 'application/pdf' || m.includes('pdf')) return { kind: 'raw', defaultFolder: 'lms/documents' };
  return { kind: 'image', defaultFolder: 'lms/images' };
}

async function uploadToCloudinary(dataUrl, kind, folder) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !key || !secret) {
    throw new Error('Cloudinary credentials missing. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are set.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', dataUrl);
  form.append('api_key', key);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || `Cloudinary upload failed (HTTP ${res.status})`);
  }

  return json.secure_url;
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 LIVE PRODUCTION MEDIA -> CLOUDINARY MIGRATION TOOL');
  console.log('====================================================');

  const rawUrl = customDbUrlArg || process.env.DATABASE_URL || process.env.DB_URL;
  if (!rawUrl) {
    console.error('❌ Error: No database URL provided.');
    console.error('Please pass it as an argument: node scripts/migrateProductionToCloudinary.js "postgresql://..."');
    console.error('Or set DATABASE_URL in your .env / Render environment variables.');
    process.exit(1);
  }

  // Strip PgBouncer channel_binding parameter
  const dbUrl = rawUrl
    .replace(/&channel_binding=[^&]*/g, '')
    .replace(/\?channel_binding=[^&]*&?/g, '?')
    .replace(/\?$/, '');

  try {
    const hostMatch = dbUrl.match(/@([^:/]+)/);
    if (hostMatch && hostMatch[1]) {
      console.log(`📡 Connecting to target database: ${hostMatch[1]}`);
    }
  } catch (_) {}

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.error('❌ Error: CLOUDINARY_CLOUD_NAME is not set.');
    process.exit(1);
  }
  console.log(`☁️  Target Cloudinary account: ${cloudName}`);
  console.log(`⚙️  Mode: ${isDryRun ? '🔍 DRY RUN (Scan only, no changes will be made)' : '⚡ LIVE APPLY (Upload to Cloudinary & update database URLs)'}\n`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connected to database successfully!\n');

  let totalScanned = 0;
  let totalFound = 0;
  let totalMigrated = 0;
  let totalBytesFreed = 0;
  const migratedDetails = [];

  for (const target of TARGET_COLUMNS) {
    const { table, column, defaultFolder } = target;

    try {
      // 1. Check if table and column exist
      const checkCol = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (checkCol.rows.length === 0) {
        continue;
      }

      // 2. Find any rows with Base64 data URLs
      const rowsQuery = await client.query(
        `SELECT id, length("${column}") as len FROM "${table}" WHERE "${column}" LIKE 'data:%'`
      );

      totalScanned += rowsQuery.rows.length;
      if (rowsQuery.rows.length === 0) {
        continue;
      }

      totalFound += rowsQuery.rows.length;
      const tableBytes = rowsQuery.rows.reduce((sum, r) => sum + Number(r.len), 0);
      totalBytesFreed += tableBytes;

      console.log(`📦 Found ${rowsQuery.rows.length} Base64 records in "${table}"."${column}" (~${(tableBytes / 1024 / 1024).toFixed(2)} MB)`);

      if (isDryRun) {
        continue;
      }

      // 3. Migrate each row to Cloudinary
      for (const r of rowsQuery.rows) {
        const fullRowQuery = await client.query(
          `SELECT "${column}" as val FROM "${table}" WHERE id = $1`,
          [r.id]
        );
        const rawVal = fullRowQuery.rows[0]?.val;
        if (!rawVal || !rawVal.startsWith('data:')) continue;

        const mime = (rawVal.match(/^data:([^;,]+)/) || [])[1] || 'image/jpeg';
        const detected = detectKind(mime);
        const folder = target.folder || detected.defaultFolder;

        process.stdout.write(`   ⏳ Uploading ${table} ID ${r.id} (${(Number(r.len) / 1024 / 1024).toFixed(2)} MB)... `);
        try {
          const cloudinaryUrl = await uploadToCloudinary(rawVal, detected.kind, folder);
          await client.query(
            `UPDATE "${table}" SET "${column}" = $1 WHERE id = $2`,
            [cloudinaryUrl, r.id]
          );
          process.stdout.write(`✅ Done\n      ↳ URL: ${cloudinaryUrl}\n`);
          totalMigrated++;
          migratedDetails.push({ table, column, id: r.id, url: cloudinaryUrl });
        } catch (err) {
          process.stdout.write(`❌ Failed (${err.message})\n`);
        }
      }
    } catch (err) {
      console.warn(`⚠️  Skipped ${table}.${column}: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('📊 MIGRATION SUMMARY:');
  console.log(`• Total Base64 records found:    ${totalFound}`);
  if (!isDryRun) {
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "AppMigrations" (
          "name" VARCHAR(255) PRIMARY KEY,
          "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        INSERT INTO "AppMigrations" ("name") VALUES ('migrate_base64_to_cloudinary_v1') ON CONFLICT ("name") DO NOTHING;
      `);
      console.log('🔒 Migration locked permanently in "AppMigrations" table (will not re-run).');
    } catch (_) {}
    console.log(`• Successfully moved to Cloudinary: ${totalMigrated}`);
    console.log(`• Total Database size freed:        ~${(totalBytesFreed / 1024 / 1024).toFixed(2)} MB`);
    console.log('• Database network transfer per query reduced to ~0 MB!');
  } else {
    console.log(`• Potential Database size to free:  ~${(totalBytesFreed / 1024 / 1024).toFixed(2)} MB`);
    console.log('• To execute migration, run without --dry-run');
  }
  console.log('====================================================\n');

  await client.end();
}

runMigration().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
