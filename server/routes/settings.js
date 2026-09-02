import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sendEmail } from '../services/emailService.js';
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

// POST /api/settings/client-error
// Log frontend crash reports
router.post('/client-error', asyncHandler(async (req, res) => {
  const bodyString = JSON.stringify(req.body).substring(0, 2000); // Limit size
  const logLine = `[${new Date().toISOString()}] CLIENT CRASH: ${bodyString}\n`;
  fs.appendFileSync(path.resolve(__dirname, '../../client-errors.log'), logLine);

  // Optionally: trigger email to admin
  // await sendEmail({ to: 'admin@hotel.com', subject: 'Frontend Crash Report', text: logLine });

  res.status(200).json({
    success: true
  });
}));
router.get('/system', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const [dbResult] = await db.raw('SELECT version() as version');
  const ticketCount = await db('tickets').count('* as count').first();
  const userCount = await db('users').whereNull('deleted_at').count('* as count').first();
  res.json({
    app: {
      name: process.env.APP_NAME || 'Hotel Operations System',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timezone: process.env.APP_TIMEZONE || 'Indian/Mauritius'
    },
    database: {
      type: 'PostgreSQL',
      version: dbResult?.version || 'unknown',
      total_tickets: parseInt(ticketCount?.count || 0),
      total_users: parseInt(userCount?.count || 0)
    },
    backup: {
      last_backup: null,
      instructions: 'Use pg_dump to create a database backup. See README for commands.'
    }
  });
}));

// GET /api/settings/sla
router.get('/sla', authenticate, asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  const configs = await db('sla_configs').where({
    hotel_id: hotelId
  }).orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END");
  res.json({
    configs
  });
}));

// PUT /api/settings/sla
router.put('/sla', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  const {
    configs
  } = req.body;
  if (!configs || !Array.isArray(configs)) {
    return res.status(400).json({
      error: 'Configs array is required.'
    });
  }
  for (const config of configs) {
    await db('sla_configs').where({
      hotel_id: hotelId,
      priority: config.priority
    }).update({
      response_time_minutes: config.response_time_minutes,
      resolution_time_minutes: config.resolution_time_minutes,
      escalation_time_minutes: config.escalation_time_minutes,
      updated_at: new Date()
    });
  }
  const updated = await db('sla_configs').where({
    hotel_id: hotelId
  }).orderBy('priority');
  res.json({
    configs: updated,
    message: 'SLA configs updated.'
  });
}));

// GET /api/settings/public (Unauthenticated)
router.get('/public', asyncHandler((req, res) => {
  let envConfig = {};
  try {
    if (fs.existsSync(envPath)) {
      envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
    }
  } catch (err) {
    console.error('[Settings] Failed to read .env file:', err);
  }
  res.json({
    APP_NAME: envConfig.APP_NAME || process.env.APP_NAME || 'IT Ticketing System',
    APP_LOGO_URL: envConfig.APP_LOGO_URL || process.env.APP_LOGO_URL || '/logo.png',
    APP_BG_COLOR: envConfig.APP_BG_COLOR || process.env.APP_BG_COLOR || '#0f172a',
    APP_BG_IMAGE_URL: envConfig.APP_BG_IMAGE_URL || process.env.APP_BG_IMAGE_URL || '',
    APP_THEME: envConfig.APP_THEME || process.env.APP_THEME || 'dark'
  });
}));

// GET /api/settings/env (Admin only)
router.get('/env', authenticate, authorize('admin', 'manager'), asyncHandler((req, res) => {
  let envConfig = {};
  try {
    if (fs.existsSync(envPath)) {
      envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
    }
  } catch (err) {
    console.error('[Settings] Failed to read .env file:', err);
  }

  // Merge with process.env and provide fallback defaults for UI
  const responseEnv = {
    ...envConfig,
    APP_NAME: envConfig.APP_NAME || process.env.APP_NAME || 'IT Ticketing System',
    APP_URL: envConfig.APP_URL || process.env.APP_URL || 'http://localhost:3001',
    APP_TIMEZONE: envConfig.APP_TIMEZONE || process.env.APP_TIMEZONE || 'Indian/Mauritius',
    PORT: envConfig.PORT || process.env.PORT || '3001',
    NODE_ENV: envConfig.NODE_ENV || process.env.NODE_ENV || 'development',
    APP_LOGO_URL: envConfig.APP_LOGO_URL || process.env.APP_LOGO_URL || '/logo.png',
    APP_BG_COLOR: envConfig.APP_BG_COLOR || process.env.APP_BG_COLOR || '#0f172a',
    APP_BG_IMAGE_URL: envConfig.APP_BG_IMAGE_URL || process.env.APP_BG_IMAGE_URL || '',
    APP_THEME: envConfig.APP_THEME || process.env.APP_THEME || 'dark',
    SMTP_ENABLED: envConfig.SMTP_ENABLED || process.env.SMTP_ENABLED || 'false',
    SMTP_HOST: envConfig.SMTP_HOST || process.env.SMTP_HOST || '',
    SMTP_PORT: envConfig.SMTP_PORT || process.env.SMTP_PORT || '587',
    SMTP_SECURE: envConfig.SMTP_SECURE || process.env.SMTP_SECURE || 'false',
    SMTP_USER: envConfig.SMTP_USER || process.env.SMTP_USER || '',
    SMTP_PASS: envConfig.SMTP_PASS || process.env.SMTP_PASS || '',
    SMTP_FROM: envConfig.SMTP_FROM || process.env.SMTP_FROM || '',
    DB_HOST: envConfig.DB_HOST || process.env.DB_HOST || 'localhost',
    DB_PORT: envConfig.DB_PORT || process.env.DB_PORT || '5432',
    DB_NAME: envConfig.DB_NAME || process.env.DB_NAME || 'hotel_tickets',
    DB_USER: envConfig.DB_USER || process.env.DB_USER || 'postgres',
    DB_PASSWORD: envConfig.DB_PASSWORD || process.env.DB_PASSWORD || '',
    JWT_SECRET: envConfig.JWT_SECRET || process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: envConfig.JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m',
    LOGIN_RATE_LIMIT_MAX: envConfig.LOGIN_RATE_LIMIT_MAX || process.env.LOGIN_RATE_LIMIT_MAX || '5',
    LOGIN_RATE_LIMIT_WINDOW_MS: envConfig.LOGIN_RATE_LIMIT_WINDOW_MS || process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'
  };

  // Redact sensitive secrets — show only that they are configured, never the actual value
  const REDACTED_KEYS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD', 'SMTP_PASS'];
  for (const key of REDACTED_KEYS) {
    if (responseEnv[key]) {
      responseEnv[key] = '••••••••' + responseEnv[key].slice(-4);
    }
  }
  res.json({
    env: responseEnv
  });
}));

// PUT /api/settings/env (Admin only)
router.put('/env', authenticate, authorize('admin', 'manager'), asyncHandler((req, res) => {
  const {
    updates
  } = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({
      error: 'Invalid updates payload.'
    });
  }

  const SAFE_KEYS = [
    'APP_NAME', 'APP_URL', 'APP_TIMEZONE', 'APP_THEME', 'APP_LOGO_URL',
    'APP_BG_COLOR', 'APP_BG_IMAGE_URL',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS',
    'SMTP_FROM', 'SMTP_ENABLED',
    'LOGIN_RATE_LIMIT_MAX', 'LOGIN_RATE_LIMIT_WINDOW_MS'
  ];

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '');
  }
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Update or append keys
  for (const [key, value] of Object.entries(updates)) {
    if (!SAFE_KEYS.includes(key)) {
      continue; // Skip dangerous keys
    }
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, () => `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(envPath, envContent);
  res.json({
    message: 'Environment configurations updated. Server restarting...'
  });

  // Trigger restart
  setTimeout(() => {
    console.log('Restarting server to apply new environment configurations...');
    process.exit(0);
  }, 1000);
}));

// GET /api/settings/hotel
router.get('/hotel', authenticate, asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  const settings = await db('settings').where({
    hotel_id: hotelId
  });
  const config = {};
  settings.forEach(s => {
    config[s.key] = s.value;
  });

  // Provide defaults if not found
  if (!config.TICKET_PREFIX) config.TICKET_PREFIX = 'IT-';
  if (!config.DEFAULT_PRIORITY) config.DEFAULT_PRIORITY = 'medium';
  if (!config.ALLOW_GUEST_TICKETS) config.ALLOW_GUEST_TICKETS = 'false';
  res.json({
    settings: config
  });
}));

// PUT /api/settings/hotel
router.put('/hotel', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  const {
    updates
  } = req.body;
  if (!updates) return res.status(400).json({
    error: 'Updates required.'
  });
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db('settings').where({
      hotel_id: hotelId,
      key
    }).first();
    if (existing) {
      await db('settings').where({
        hotel_id: hotelId,
        key
      }).update({
        value: String(value),
        updated_at: new Date()
      });
    } else {
      await db('settings').insert({
        hotel_id: hotelId,
        key,
        value: String(value)
      });
    }
  }
  res.json({
    message: 'Hotel settings updated.'
  });
}));

// POST /api/settings/test-email (Admin only)
router.post('/test-email', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    to
  } = req.body;
  if (!to) return res.status(400).json({
    error: 'Recipient email is required.'
  });
  const success = await sendEmail({
    to,
    subject: 'Hotel Operations System - SMTP Test',
    text: 'Hello! If you are reading this, your SMTP configuration is successfully working.',
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>SMTP Configuration Successful 🎉</h2>
          <p>Hello,</p>
          <p>If you are reading this email, your Hotel Operations System SMTP configuration is correctly set up and functioning.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated test email sent from your system settings.</p>
        </div>
      `
  }, true); // pass true to throw error

  res.json({
    message: 'Test email sent successfully.'
  });
}));
export default router;