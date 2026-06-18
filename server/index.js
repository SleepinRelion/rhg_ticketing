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
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import auditLogRoutes from './routes/auditLogs.js';
import savedViewRoutes from './routes/savedViews.js';
import preventiveMaintenanceRoutes from './routes/preventiveMaintenance.js';
import settingsRoutes from './routes/settings.js';
import hotelRoutes from './routes/hotels.js';
import backupRoutes from './routes/backups.js';
import { initializeCronJobs } from './services/backupService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
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

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: false, // Disable Strict-Transport-Security for local/internal HTTP
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow websockets
      upgradeInsecureRequests: null, // Disable automatic HTTPS upgrades
    },
  } : false,
}));

// Request logging via Morgan and Winston
const morganFormat = process.env.NODE_ENV !== 'production' ? 'dev' : 'combined';
app.use(morgan(morganFormat, { stream: { write: message => logger.info(message.trim()) } }));

// Apply global rate limiter to all /api routes
import { globalApiLimiter } from './middleware/rateLimiter.js';
app.use('/api', globalApiLimiter);

// CORS
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../client/dist')));
}

// API Routes
app.use('/api/auth', authRoutes);
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
