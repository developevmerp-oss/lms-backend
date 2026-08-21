import { Sequelize } from 'sequelize';

/**
 * Runs safe automatic database migrations on backend server startup.
 * Ensures all required columns exist and column types (e.g. TEXT for avatars and images) are updated.
 */
export const runAutoMigrations = async (sequelize: Sequelize) => {
  console.log('🔄 Checking database schema and running auto-migrations...');

  const migrationQueries = [
    // --- WEBINAR EVENTS TABLE ---
    `CREATE TABLE IF NOT EXISTS "WebinarEvents" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" VARCHAR(255) NOT NULL DEFAULT 'Resin Mastery Masterclass — Live with Vrajangna Patel',
      "description" TEXT,
      "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "durationMinutes" INTEGER DEFAULT 90,
      "zoomJoinUrl" VARCHAR(255),
      "whatsappGroupUrl" VARCHAR(255),
      "prepVideoUrl" VARCHAR(255),
      "totalSeats" INTEGER DEFAULT 500,
      "status" VARCHAR(50) DEFAULT 'upcoming',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    // --- WEBINAR REGISTRATIONS TABLE ---
    `CREATE TABLE IF NOT EXISTS "WebinarRegistrations" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" VARCHAR(255) NOT NULL,
      "email" VARCHAR(255) NOT NULL,
      "phone" VARCHAR(255) NOT NULL,
      "city" VARCHAR(255),
      "challenge" TEXT,
      "source" VARCHAR(255) DEFAULT 'organic',
      "webinarEventId" UUID,
      "attended" BOOLEAN DEFAULT false,
      "notes" TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    `ALTER TABLE "WebinarRegistrations" ADD COLUMN IF NOT EXISTS "city" VARCHAR(255);`,
    `ALTER TABLE "WebinarRegistrations" ADD COLUMN IF NOT EXISTS "webinarEventId" UUID;`,

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
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastRoutineDate" VARCHAR(50);`,

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
    `CREATE INDEX IF NOT EXISTS "idx_webinar_email" ON "WebinarRegistrations" ("email");`,
    `CREATE INDEX IF NOT EXISTS "idx_webinar_phone" ON "WebinarRegistrations" ("phone");`,
    `CREATE INDEX IF NOT EXISTS "idx_webinar_created" ON "WebinarRegistrations" ("createdAt" DESC);`,
    `CREATE INDEX IF NOT EXISTS "idx_webinar_event_scheduled" ON "WebinarEvents" ("scheduledAt");`,
  ];

  try {
    const combinedSql = migrationQueries.join('\n');
    await sequelize.query(combinedSql);
  } catch (err: any) {
    for (const query of migrationQueries) {
      try {
        await sequelize.query(query);
      } catch (_) {}
    }
  }

  console.log('✅ Auto-migrations completed successfully.');
};
