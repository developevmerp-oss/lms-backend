import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import routes from './routes';
import { startKeepAlive } from './config/keepAlive';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Robust CORS configuration ──
// Browsers block credentials: true with wildcard '*'. We dynamically allow the request origin.
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server) or any matching domain
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Health endpoint (must be before auth middleware) ──
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'LMS Backend is running', ts: Date.now() });
});

app.use('/api', routes);

import { runAutoMigrations } from './config/autoMigrate';

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
    console.log('✅ Ready to serve requests');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();

