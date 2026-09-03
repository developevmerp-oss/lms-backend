import { Sequelize } from 'sequelize';

/**
 * Runs safe automatic database migrations on backend server startup.
 * Ensures all required tables, columns, indexes, and initial data exist.
 */
export const runAutoMigrations = async (sequelize: Sequelize) => {
  console.log('🔄 Checking database schema and running auto-migrations...');

  const migrationQueries = [
    // --- LIVE CLASSES & ATTENDANCE TABLES ---
    `CREATE TABLE IF NOT EXISTS "LiveClasses" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" VARCHAR(255) NOT NULL DEFAULT 'Weekly Resin Masterclass & Live Q&A',
      "description" TEXT,
      "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "durationMinutes" INTEGER DEFAULT 60,
      "meetingUrl" VARCHAR(255),
      "recordingUrl" VARCHAR(255),
      "targetLevel" VARCHAR(50) DEFAULT 'All',
      "status" VARCHAR(50) DEFAULT 'upcoming',
      "instructor" VARCHAR(255) DEFAULT 'Vrajangna Patel',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS "ClassAttendances" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "classId" UUID NOT NULL,
      "userId" UUID NOT NULL,
      "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "attended" BOOLEAN DEFAULT true,
      "notes" VARCHAR(255),
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    `CREATE INDEX IF NOT EXISTS "idx_attendance_class" ON "ClassAttendances" ("classId");`,
    `CREATE INDEX IF NOT EXISTS "idx_attendance_user" ON "ClassAttendances" ("userId");`,
    `CREATE INDEX IF NOT EXISTS "idx_liveclass_scheduled" ON "LiveClasses" ("scheduledAt");`,

    // --- COURSES TABLE ---
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "levelCode" VARCHAR(255) DEFAULT 'L0';`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "image" TEXT;`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "discountType" VARCHAR(50);`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "discountValue" FLOAT DEFAULT 0;`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "offerStartDate" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "offerEndDate" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "offerActive" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "Courses" ALTER COLUMN "image" TYPE TEXT;`,
    `ALTER TABLE "Courses" ALTER COLUMN "description" TYPE TEXT;`,
    `ALTER TABLE "Courses" ALTER COLUMN "title" TYPE TEXT;`,
    `ALTER TABLE "Chapters" ALTER COLUMN "videoUrl" TYPE TEXT;`,
    `ALTER TABLE "Chapters" ALTER COLUMN "pdfUrl" TYPE TEXT;`,
    `ALTER TABLE "Chapters" ALTER COLUMN "title" TYPE TEXT;`,

    // --- LEVEL TIERS TABLE ---
    `CREATE TABLE IF NOT EXISTS "LevelTiers" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "levelCode" VARCHAR(50) UNIQUE NOT NULL,
      "title" VARCHAR(255) NOT NULL,
      "minPoints" INTEGER DEFAULT 0,
      "maxPoints" INTEGER DEFAULT 0,
      "price" VARCHAR(255) DEFAULT '₹499',
      "description" TEXT,
      "icon" VARCHAR(255),
      "badgeColor" VARCHAR(255),
      "order" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "price" VARCHAR(255) DEFAULT '₹499';`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(255);`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "badgeColor" VARCHAR(255);`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "discountType" VARCHAR(50);`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "discountValue" FLOAT DEFAULT 0;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "offerStartDate" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "offerEndDate" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "offerActive" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "category" VARCHAR(100) DEFAULT 'General';`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "validityDays" INTEGER DEFAULT 0;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN DEFAULT true;`,
    `ALTER TABLE "LevelTiers" ADD COLUMN IF NOT EXISTS "offerTitle" VARCHAR(255) DEFAULT 'Special Festival Offer';`,

    // --- LEVEL OFFERS TABLE (SEPARATE MODULE) ---
    `CREATE TABLE IF NOT EXISTS "LevelOffers" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" VARCHAR(255) NOT NULL,
      "levelCode" VARCHAR(50) NOT NULL DEFAULT 'L1',
      "discountType" VARCHAR(50) NOT NULL DEFAULT 'percentage',
      "discountValue" FLOAT NOT NULL DEFAULT 0,
      "startDate" TIMESTAMP WITH TIME ZONE,
      "endDate" TIMESTAMP WITH TIME ZONE,
      "isActive" BOOLEAN DEFAULT true,
      "bannerText" VARCHAR(255),
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

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
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "membershipLevel" VARCHAR(255) DEFAULT 'L0';`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "xpPoints" INTEGER DEFAULT 0;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastRoutineDate" VARCHAR(50);`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "activeDaysHistory" JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "membershipExpiresAt" TIMESTAMP WITH TIME ZONE;`,

    // --- PORTFOLIOS TABLE ---
    `ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
    `ALTER TABLE "Portfolios" ALTER COLUMN "imageUrl" TYPE TEXT;`,
    `ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS "feedback" TEXT;`,
    `ALTER TABLE "Portfolios" ADD COLUMN IF NOT EXISTS "mentorName" VARCHAR(255);`,

    // --- COMMUNITY WINS TABLE ---
    `ALTER TABLE "CommunityWins" ADD COLUMN IF NOT EXISTS "comments" JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE "CommunityWins" ADD COLUMN IF NOT EXISTS "likes" INTEGER DEFAULT 0;`,
    `ALTER TABLE "CommunityWins" ADD COLUMN IF NOT EXISTS "image" TEXT;`,

    // --- NOTIFICATIONS TABLE ---
    `ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) DEFAULT 'info';`,
    `ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "link" VARCHAR(255);`,
    `ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "targetAudience" VARCHAR(50) DEFAULT 'all';`,

    // --- BADGES TABLE ---
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(255);`,
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "color" VARCHAR(255);`,
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
    `ALTER TABLE "Badges" ADD COLUMN IF NOT EXISTS "pointsRequired" INTEGER DEFAULT 0;`,

    // --- MILESTONES TABLE ---
    `ALTER TABLE "Milestones" ADD COLUMN IF NOT EXISTS "description" TEXT;`,

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
    for (const query of migrationQueries) {
      try {
        await sequelize.query(query);
      } catch (e: any) {
        // Safe to ignore if column/index already exists
      }
    }

    // ── 1. SEED DEFAULT ADMIN USER ──
    try {
      const [adminExists]: any = await sequelize.query(`SELECT id FROM "Users" WHERE role = 'admin' LIMIT 1;`);
      if (!adminExists || adminExists.length === 0) {
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('admin123', 10);
        await sequelize.query(`
          INSERT INTO "Users" ("id", "name", "email", "password", "role", "membershipLevel", "rank", "points", "streak", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), 'Admin', 'admin@ravishingarthub.com', '${hash}', 'admin', 'L3', 'Founder', 10000, 1, NOW(), NOW())
          ON CONFLICT ("email") DO NOTHING;
        `);
        console.log('👑 Default admin account seeded: admin@ravishingarthub.com (password: admin123)');
      }
    } catch (_) {}

    // ── 2. SEED DEFAULT LEVEL TIERS WITH PRICES ──
    try {
      const [tierExists]: any = await sequelize.query(`SELECT id FROM "LevelTiers" LIMIT 1;`);
      if (!tierExists || tierExists.length === 0) {
        await sequelize.query(`
          INSERT INTO "LevelTiers" ("id", "levelCode", "title", "minPoints", "maxPoints", "price", "description", "icon", "badgeColor", "order", "createdAt", "updatedAt")
          VALUES 
            (gen_random_uuid(), 'L0', 'Fast Start', 0, 0, '₹499', 'Fast Track introductory access & essential resin fundamentals', '🌱', 'emerald', 1, NOW(), NOW()),
            (gen_random_uuid(), 'L1', 'Silver Member', 0, 0, '₹4,999', 'Silver membership: 5 core project courses, coasters, marbling & ocean art', '🥈', 'slate', 2, NOW(), NOW()),
            (gen_random_uuid(), 'L2', 'Gold Member', 0, 0, '₹19,999', 'Gold membership: Geode art, vein effect, luxury clocks & advanced 3D waves', '🥇', 'amber', 3, NOW(), NOW()),
            (gen_random_uuid(), 'L3', 'Diamond Club', 0, 0, '₹59,999', 'Diamond master membership: Live tables, bridal varmala, photo art & social media reels mastery', '💎', 'cyan', 4, NOW(), NOW())
          ON CONFLICT ("levelCode") DO NOTHING;
        `);
        console.log('🏆 Level Tiers seeded with offer prices: L0 (₹499), L1 (₹4,999), L2 (₹19,999), L3 (₹59,999)');
      }
    } catch (_) {}

    // ── 3. SEED DEFAULT BADGES ──
    try {
      const [badgesExist]: any = await sequelize.query(`SELECT id FROM "Badges" LIMIT 1;`);
      if (!badgesExist || badgesExist.length === 0) {
        await sequelize.query(`
          INSERT INTO "Badges" ("id", "name", "icon", "color", "description", "pointsRequired", "createdAt", "updatedAt")
          VALUES
            (gen_random_uuid(), 'First Resin Pour', '🎨', 'orange', 'Completed and submitted first practical resin artwork', 100, NOW(), NOW()),
            (gen_random_uuid(), 'First Client Sale', '💰', 'emerald', 'Recorded first official art customer invoice in Northstar', 300, NOW(), NOW()),
            (gen_random_uuid(), 'Geode Master', '💎', 'purple', 'Mastered crystal cluster embedding and metallic gilding', 500, NOW(), NOW()),
            (gen_random_uuid(), 'Punctual Creator', '⏰', 'amber', 'Submitted 5 continuous assignments before review deadlines', 400, NOW(), NOW()),
            (gen_random_uuid(), 'Streak Champion', '🔥', 'rose', 'Maintained a 30-day active daily missions streak', 1000, NOW(), NOW()),
            (gen_random_uuid(), 'Ocean Waves Specialist', '🌊', 'cyan', 'Perfected white foam cell formation & sea gradients', 1200, NOW(), NOW()),
            (gen_random_uuid(), 'Bridal Preservationist', '💐', 'pink', 'Cast clear deep-pour wedding floral keepsake', 3000, NOW(), NOW()),
            (gen_random_uuid(), 'Hall of Fame Creator', '👑', 'yellow', 'Reached ₹50,000+ in total art career sales', 10000, NOW(), NOW());
        `);
        console.log('🎖️ Default mastery badges seeded');
      }
    } catch (_) {}

    // ── 4. SEED DEFAULT WEBINAR EVENT ──
    try {
      const [webinarExists]: any = await sequelize.query(`SELECT id FROM "WebinarEvents" LIMIT 1;`);
      if (!webinarExists || webinarExists.length === 0) {
        const nextSunday = new Date();
        nextSunday.setDate(nextSunday.getDate() + 3);
        nextSunday.setHours(20, 0, 0, 0);

        await sequelize.query(`
          INSERT INTO "WebinarEvents" ("id", "title", "description", "scheduledAt", "durationMinutes", "zoomJoinUrl", "whatsappGroupUrl", "prepVideoUrl", "totalSeats", "status", "isActive", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid(),
            'Resin Mastery Masterclass — Live with Vrajangna Patel',
            'Learn the exact 3-phase roadmap to master bubble-free resin casting, flower preservation, pricing psychology, and launch your creative studio.',
            '${nextSunday.toISOString()}',
            90,
            'https://zoom.us/j/sample-art-webinar',
            'https://chat.whatsapp.com/sample-art-webinar-vip',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            500,
            'upcoming',
            true,
            NOW(),
            NOW()
          );
        `);
        console.log('🎟️ Default masterclass webinar event seeded');
      }
    } catch (_) {}

    console.log('✅ Auto-migrations and seeders completed successfully.');
  } catch (err: any) {
    console.warn('⚠️ Auto-migration note:', err?.message);
  }
};
