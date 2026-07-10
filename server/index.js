import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler.js';
import { runSLACheck } from './services/slaService.js';
import morgan from 'morgan';
import logger from './config/logger.js';

// Routes
import importRouter from './routes/import.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import ticketRoutes from './routes/tickets.js';
import roomRoutes from './routes/rooms.js';
import assetRoutes from './routes/assets.js';
import interventionRoutes from './routes/interventions.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import checklistRoutes from './routes/checklists.js';
import attachmentRoutes from './routes/attachments.js';
import categoryRoutes from './routes/categories.js';
import departmentRoutes from './routes/departments.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import auditLogRoutes from './routes/auditLogs.js';
import savedViewRoutes from './routes/savedViews.js';
import preventiveMaintenanceRoutes from './routes/preventiveMaintenance.js';
import settingsRoutes from './routes/settings.js';
import hotelRoutes from './routes/hotels.js';
import backupRoutes from './routes/backups.js';
import { initializeCronJobs } from './services/backupService.js';

import { rateLimit } from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx) to get correct req.ip
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.APP_URL || 'http://localhost:5173',
    credentials: true,
  }
});

// Attach io to req so routes can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 3001;


// Security checks
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret') {
    logger.error('FATAL: Refusing to start in production with default or missing JWT_SECRET. This is a severe cryptographic vulnerability (A04:2025). Please set a secure JWT_SECRET in .env.');
    process.exit(1);
  }
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false, // Can break external assets and PWA
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Added unsafe-eval for some dependencies
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "*"], // Allow all connections for now to rule out API blocking
      upgradeInsecureRequests: null,
    },
  } : false,
}));

// Request logging via Morgan and Winston
const morganFormat = process.env.NODE_ENV !== 'production' ? 'dev' : 'combined';
app.use(morgan(morganFormat, { stream: { write: message => logger.info(message.trim()) } }));

// Apply global rate limiter to all /api routes
import { globalApiLimiter, loginLimiter } from './middleware/rateLimiter.js';
app.use('/api', globalApiLimiter);

// CORS
const allowedOrigins = (process.env.APP_URL || 'http://localhost:3001').split(',').map(s => s.trim().replace(/\/$/, ''));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server, same-origin)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any of the allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // If not allowed, DO NOT throw an error (which causes 500s). 
    // Just return false so CORS headers are not added.
    return callback(null, false);
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../client/dist'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        // Cache static assets (JS/CSS) for 1 year since they have content hashes
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));
}

// API Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/import', importRouter);
app.use('/api/checklists', checklistRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/preventive-maintenance', preventiveMaintenanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/backups', backupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), timezone: process.env.APP_TIMEZONE || 'Indian/Mauritius' });
});

// Catch-all for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
  });
}

// Global error handler
app.use(errorHandler);

// Start server
httpServer.listen(PORT, async () => {
  logger.info(`\n🏨 Hotel Operations System`);
  logger.info(`   Server running on http://localhost:${PORT}`);
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Timezone: ${process.env.APP_TIMEZONE || 'Indian/Mauritius'}\n`);
  
  await initializeCronJobs();
});

// SLA check cron - runs every 5 minutes
setInterval(() => {
  runSLACheck().catch((err) => logger.error(`SLA check failed: ${err.message}`));
}, 5 * 60 * 1000);

// Run initial SLA check after 10 seconds
setTimeout(() => {
  runSLACheck().catch((err) => logger.error(`Initial SLA check failed: ${err.message}`));
}, 10000);

export default app;
