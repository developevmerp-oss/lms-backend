import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgres://root:rootpassword@localhost:5432/art_lms_db';

const isProduction = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'));

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  ...(isProduction ? {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  } : {})
});

