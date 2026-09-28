import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Neon.tech PostgreSQL connection — MUST use the pooler endpoint (-pooler. in hostname)
// to reduce per-connection overhead and stay within free-tier network transfer limits.
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_JOwIH8s5gTuq@ep-divine-water-ay53xryl-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Enforce pooler URL — if someone accidentally uses the direct endpoint, warn them
if (dbUrl.includes('neon.tech') && !dbUrl.includes('-pooler.')) {
  console.warn(
    '[DB] ⚠️  WARNING: You are using a direct Neon connection (not the pooler)! ' +
    'This burns much more network transfer. Switch to the pooler endpoint (-pooler. in hostname).'
  );
}

const isNeonOrSsl =
  process.env.NODE_ENV === 'production' ||
  process.env.DB_SSL === 'true' ||
  dbUrl.includes('neon.tech') ||
  dbUrl.includes('sslmode=require');

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,

  // ── Connection Pool — keep it small to reduce Neon network transfer ──
  // Neon free tier is sensitive to connection count and data transfer.
  // Keeping max=3 significantly reduces per-query overhead.
  pool: {
    max: 3,        // Max simultaneous DB connections (default is 5; lower = less transfer)
    min: 0,        // Allow pool to drain to 0 when idle — saves compute hours too
    acquire: 30000, // Max ms to wait for a connection before throwing an error
    idle: 10000,   // Close connections idle for 10s (prevents stale connections)
    evict: 15000,  // Run eviction checks every 15s
  },

  ...(isNeonOrSsl
    ? {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          // Set PostgreSQL statement timeout to prevent stuck queries from
          // holding connections open and burning data transfer
          statement_timeout: 30000,       // Kill queries running > 30 seconds
          idle_in_transaction_session_timeout: 20000, // Kill idle transactions > 20s
          connect_timeout: 15,            // TCP connect timeout in seconds
        },
      }
    : {}),
});
