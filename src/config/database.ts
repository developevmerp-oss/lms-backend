import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// User's active Neon.tech PostgreSQL connection with pooled connection string
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_hG6P0nVriydo@ep-weathered-fire-ay8swz32-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const isNeonOrSsl =
  process.env.NODE_ENV === 'production' ||
  process.env.DB_SSL === 'true' ||
  dbUrl.includes('neon.tech') ||
  dbUrl.includes('sslmode=require');

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  ...(isNeonOrSsl
    ? {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
      }
    : {}),
});
