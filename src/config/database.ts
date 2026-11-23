import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Neon.tech PostgreSQL connection — MUST use the pooler endpoint (-pooler. in hostname)
// to reduce per-connection overhead and stay within free-tier network transfer limits.
// SECURITY: never hard-code a connection string here (it ends up in git history).
const rawDbUrl = process.env.DATABASE_URL || process.env.DB_URL || process.env.POSTGRES_URL;
if (!rawDbUrl) {
  throw new Error('DATABASE_URL is not set. Add it to .env (local) or the Render environment variables.');
}

// Strip channel_binding parameter because pg driver does not support it with PgBouncer connection poolers
const dbUrl = rawDbUrl
  .replace(/&channel_binding=[^&]*/g, '')
  .replace(/\?channel_binding=[^&]*&?/g, '?')
  .replace(/\?$/, '');

try {
  const hostMatch = dbUrl.match(/@([^:/]+)/);
  if (hostMatch && hostMatch[1]) {
    console.log(`[DB] Connecting to database host: ${hostMatch[1]}`);
  }
} catch (_) { }

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
  define: {
    schema: 'public',
  },

  // ── Connection Pool for Neon Serverless ──
  // Setting min: 0 allows idle connections to close after 10 seconds of inactivity.
  // This enables Neon to scale to 0 (sleep), preventing exhaustion of the 100 free monthly compute hours.
  pool: {
    max: 5,        // Max simultaneous DB connections
    min: 0,        // Drops to 0 when idle so Neon can sleep and preserve compute quota
    acquire: 30000, // Max ms to wait for a connection before throwing an error
    idle: 10000,   // Close connection after 10 seconds of no traffic
    evict: 5000,   // Check eviction every 5s
  },

  dialectOptions: {
    ...(isNeonOrSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          keepAlive: true,
          // Set PostgreSQL statement timeout to prevent stuck queries from
          // holding connections open and burning data transfer
          statement_timeout: 30000,       // Kill queries running > 30 seconds
          idle_in_transaction_session_timeout: 20000, // Kill idle transactions > 20s
          connect_timeout: 15,            // TCP connect timeout in seconds
        }
      : {}),
  },
});
