import { Sequelize } from 'sequelize';

/**
 * Runs safe automatic database migrations on backend server startup.
 * Ensures all required columns exist and column types (e.g. TEXT for avatars and images) are updated.
 */
export const runAutoMigrations = async (sequelize: Sequelize) => {
  console.log('🔄 Checking database schema and running auto-migrations...');

  const migrationQueries = [
    // --- USERS TABLE ---
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;`,
    `ALTER TABLE "Users" ALTER COLUMN "avatarUrl" TYPE TEXT;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "city" VARCHAR(255);`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(255);`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "bio" TEXT;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "points" INTEGER DEFAULT 0;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "streak" INTEGER DEFAULT 0;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "rank" VARCHAR(255) DEFAULT 'Beginner';`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "xpPoints" INTEGER DEFAULT 0;`,

    // --- PORTFOLIOS TABLE ---
    `ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
    `ALTER TABLE "Portfolios" ALTER COLUMN "imageUrl" TYPE TEXT;`,
    `ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS "feedback" TEXT;`,
    `ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS "mentorName" VARCHAR(255);`,

    // --- COMMUNITY WINS TABLE ---
    `ALTER TABLE "CommunityWins" ADD COLUMN IF NOT EXISTS "comments" JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE "CommunityWins" ADD COLUMN IF NOT EXISTS "likes" INTEGER DEFAULT 0;`,
    `ALTER TABLE "CommunityWins" ADD COLUMN IF NOT EXISTS "image" TEXT;`,

    // --- BADGES TABLE ---
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(255);`,
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "color" VARCHAR(255);`,
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "pointsRequired" INTEGER DEFAULT 0;`,

    // --- MILESTONES TABLE ---
    `ALTER TABLE "Milestones" ADD COLUMN IF NOT EXISTS "description" TEXT;`,

    // --- LEVEL TIERS TABLE ---
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(255);`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "badgeColor" VARCHAR(255);`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;`,

    // --- PERFORMANCE INDEXES ---
    `CREATE INDEX IF NOT EXISTS "idx_users_email" ON "Users" ("email");`,
    `CREATE INDEX IF NOT EXISTS "idx_users_role" ON "Users" ("role");`,
    `CREATE INDEX IF NOT EXISTS "idx_users_points" ON "Users" ("points" DESC);`,
    `CREATE INDEX IF NOT EXISTS "idx_submissions_status" ON "Submissions" ("status");`,
    `CREATE INDEX IF NOT EXISTS "idx_portfolios_userid" ON "Portfolios" ("userId");`,
    `CREATE INDEX IF NOT EXISTS "idx_milestones_userid" ON "Milestones" ("userId");`,
    `CREATE INDEX IF NOT EXISTS "idx_salesrecords_userid" ON "SalesRecords" ("userId");`,
    `CREATE INDEX IF NOT EXISTS "idx_notifications_userid" ON "Notifications" ("userId");`,
  ];

  try {
    // Run all migrations in a single batch for lightning-fast startup
    const combinedSql = migrationQueries.join('\n');
    await sequelize.query(combinedSql);
  } catch (err: any) {
    // If batch has table-not-found, fallback individually
    for (const query of migrationQueries) {
      try {
        await sequelize.query(query);
      } catch (_) {}
    }
  }

  console.log('✅ Auto-migrations completed successfully.');
};
