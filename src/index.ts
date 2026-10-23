import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import './models';
import routes from './routes';
import { startKeepAlive } from './config/keepAlive';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Universal CORS & Preflight Middleware ──
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// NOTE: Limit was reduced from 500mb to 10mb to prevent large payloads from
// burning Neon's monthly network transfer quota. For file uploads, use
// multipart/form-data with multer (which streams to disk, not through JSON).
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(
  '/uploads',
  express.static(uploadsDir, {
    acceptRanges: true,
    cacheControl: true,
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// ── Health endpoint with DB diagnostics ──
app.get('/api/health', async (_req, res) => {
  try {
    const [result]: any = await sequelize.query('SELECT current_database(), current_user, current_schema(), inet_server_addr()');
    const [allPgTables]: any = await sequelize.query("SELECT schemaname, tablename, tableowner FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')");
    const [searchPath]: any = await sequelize.query('SHOW search_path');
    
    let usersCount: any = null;
    let userTestError: any = null;
    try {
      const [uRes]: any = await sequelize.query('SELECT count(*) FROM "Users"');
      usersCount = uRes?.[0]?.count;
    } catch (e: any) {
      userTestError = e?.message;
    }

    res.status(200).json({
      status: 'ok',
      message: 'LMS Backend is running',
      db: {
        connected: true,
        host: (sequelize.config as any)?.host,
        database: result?.[0]?.current_database,
        user: result?.[0]?.current_user,
        currentSchema: result?.[0]?.current_schema,
        searchPath: searchPath?.[0]?.search_path,
        serverAddr: result?.[0]?.inet_server_addr,
        pgTables: allPgTables,
        usersCount,
        userTestError,
      },
      ts: Date.now(),
    });
  } catch (err: any) {
    res.status(200).json({
      status: 'error',
      message: 'LMS Backend running but DB error',
      dbError: err.message,
      ts: Date.now(),
    });
  }
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

    // Seed 30 curriculum courses asynchronously without blocking server readiness
    seedDefaultCurriculum().catch((err) => console.error('Seeding error:', err));

    console.log('✅ Ready to serve requests');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();

