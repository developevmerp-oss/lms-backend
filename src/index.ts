import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import routes from './routes';
import { startKeepAlive } from './config/keepAlive';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Universal CORS & Preflight Middleware ──
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ── Health endpoint (must be before auth middleware) ──
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'LMS Backend is running', ts: Date.now() });
});

app.use('/api', routes);

import { runAutoMigrations } from './config/autoMigrate';
import { seedDefaultCurriculum } from './controllers/course.controller';

const startServer = async () => {
  // Start HTTP listener immediately so server is instantly ready
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startKeepAlive();
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Auto-create any missing tables in the database
    await sequelize.sync();
    console.log('✅ Database models synchronized');

    // Run safe auto-migrations for missing columns and large data types
    await runAutoMigrations(sequelize);

    // Seed 30 curriculum courses now that tables are synchronized
    await seedDefaultCurriculum();

    console.log('✅ Ready to serve requests');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();

