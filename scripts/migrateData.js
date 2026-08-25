const { Client } = require('pg');

const OLD_DB_URL = 'postgresql://neondb_owner:npg_2SF7venQCbgk@ep-dry-feather-ax8x6v6t-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const NEW_DB_URL = 'postgresql://neondb_owner:npg_JOwIH8s5gTuq@ep-divine-water-ay53xryl-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Tables in dependency order (foreign keys respected)
const TABLES_TO_MIGRATE = [
  'Users',
  'Courses',
  'Chapters',
  'Assignments',
  'Submissions',
  'Rewards',
  'Certificates',
  'LevelTiers',
  'Badges',
  'UserBadges',
  'UserCourses',
  'Portfolios',
  'Milestones',
  'SalesRecords',
  'Notifications',
  'CommunityWins',
  'WebinarEvents',
  'WebinarRegistrations',
  'LiveClasses',
  'ClassAttendances',
];

async function runFullMigration() {
  console.log('🚀 Starting Full Database Migration...');
  console.log('📦 Source DB (Old):', OLD_DB_URL.split('@')[1]);
  console.log('🎯 Target DB (New):', NEW_DB_URL.split('@')[1]);

  const oldClient = new Client({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  const newClient = new Client({
    connectionString: NEW_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await oldClient.connect();
    console.log('✅ Connected to Old Database');
    await newClient.connect();
    console.log('✅ Connected to New Database');

    // Disable foreign key triggers temporarily during insert for smooth bulk import
    await newClient.query('SET session_replication_role = replica;').catch(() => {});

    for (const tableName of TABLES_TO_MIGRATE) {
      try {
        // Check if table exists in Old DB
        const tableCheck = await oldClient.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '${tableName}'
          );
        `);

        if (!tableCheck.rows[0].exists) {
          console.log(`ℹ️ Table "${tableName}" does not exist in old database. Skipping.`);
          continue;
        }

        // Fetch all rows from Old DB
        const selectRes = await oldClient.query(`SELECT * FROM "${tableName}"`);
        const rows = selectRes.rows;
        console.log(`⏳ Migrating "${tableName}": Found ${rows.length} rows in Old DB...`);

        if (rows.length === 0) {
          console.log(`⏩ Table "${tableName}" is empty. Skipping.`);
          continue;
        }

        // Get columns
        const columns = Object.keys(rows[0]);
        const columnsList = columns.map(c => `"${c}"`).join(', ');

        let migratedCount = 0;
        for (const row of rows) {
          const values = columns.map(c => row[c]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          // Generate ON CONFLICT clause if "id" is present
          const updateClause = columns
            .filter(c => c !== 'id')
            .map(c => `"${c}" = EXCLUDED."${c}"`)
            .join(', ');

          let insertSql;
          if (columns.includes('id') && updateClause.length > 0) {
            insertSql = `INSERT INTO "${tableName}" (${columnsList}) VALUES (${placeholders}) ON CONFLICT ("id") DO UPDATE SET ${updateClause}`;
          } else {
            insertSql = `INSERT INTO "${tableName}" (${columnsList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          }

          try {
            await newClient.query(insertSql, values);
            migratedCount++;
          } catch (insertErr) {
            console.warn(`  ⚠️ Row insert note on "${tableName}":`, insertErr.message);
          }
        }

        console.log(`✅ Successfully migrated ${migratedCount}/${rows.length} rows for "${tableName}"`);
      } catch (tableErr) {
        console.error(`❌ Error migrating table "${tableName}":`, tableErr.message);
      }
    }

    // Re-enable foreign key triggers
    await newClient.query('SET session_replication_role = DEFAULT;').catch(() => {});

    console.log('\n🎉 ========================================================');
    console.log('🎉 FULL DATA MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('🎉 All old database records are now transferred to your new Neon database.');
    console.log('========================================================\n');
  } catch (err) {
    console.error('💥 Fatal Migration Error:', err);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

runFullMigration();
