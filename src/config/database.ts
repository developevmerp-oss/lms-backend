import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Neon.tech PostgreSQL connection — MUST use the pooler endpoint (-pooler. in hostname)
// to reduce per-connection overhead and stay within free-tier network transfer limits.
const rawDbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://neondb_owner:npg_oZLs6xSR9Kpz@ep-lively-scene-b4zxxfwb-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

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

  // ── Connection Pool ──
  // Keeping min: 1 ensures at least 1 connection stays warm and ready, eliminating
  // the 3-5 second SSL/TCP handshake delay on every API call.
  pool: {
    max: 5,        // Max simultaneous DB connections
    min: 1,        // Keep 1 warm connection ready so queries execute immediately
    acquire: 30000, // Max ms to wait for a connection before throwing an error
    idle: 120000,  // Keep idle connections open for 2 minutes (instead of 10s)
    evict: 30000,  // Eviction check every 30s
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
