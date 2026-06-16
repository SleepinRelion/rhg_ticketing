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
router.get('/system', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [dbResult] = await db.raw('SELECT version() as version');
    const ticketCount = await db('tickets').count('* as count').first();
    const userCount = await db('users').whereNull('deleted_at').count('* as count').first();

    res.json({
      app: {
        name: process.env.APP_NAME || 'Hotel Operations System',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timezone: process.env.APP_TIMEZONE || 'Indian/Mauritius',
      },
      database: {
        type: 'PostgreSQL',
        version: dbResult?.version || 'unknown',
        total_tickets: parseInt(ticketCount?.count || 0),
        total_users: parseInt(userCount?.count || 0),
      },
      backup: {
        last_backup: null,
        instructions: 'Use pg_dump to create a database backup. See README for commands.',
      },
    });
  } catch (error) {
    console.error('System settings error:', error);
    res.status(500).json({ error: 'Failed to fetch system info.' });
  }
});

// GET /api/settings/sla
router.get('/sla', authenticate, async (req, res) => {
  try {
    const hotelId = req.headers['x-hotel-id'];
    if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

    const configs = await db('sla_configs')
      .where({ hotel_id: hotelId })
      .orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END");
    res.json({ configs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SLA configs.' });
  }
});

// PUT /api/settings/sla
router.put('/sla', authenticate, authorize('admin'), async (req, res) => {
  try {
    const hotelId = req.headers['x-hotel-id'];
    if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

    const { configs } = req.body;
    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({ error: 'Configs array is required.' });
    }

    for (const config of configs) {
      await db('sla_configs').where({ hotel_id: hotelId, priority: config.priority }).update({
        response_time_minutes: config.response_time_minutes,
        resolution_time_minutes: config.resolution_time_minutes,
        escalation_time_minutes: config.escalation_time_minutes,
        updated_at: new Date(),
      });
    }

    const updated = await db('sla_configs').where({ hotel_id: hotelId }).orderBy('priority');
    res.json({ configs: updated, message: 'SLA configs updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update SLA configs.' });
  }
});

// GET /api/settings/env (Admin only)
router.get('/env', authenticate, authorize('admin'), (req, res) => {
  try {
    if (!fs.existsSync(envPath)) {
      return res.status(404).json({ error: '.env file not found.' });
    }
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    res.json({ env: envConfig });
  } catch (error) {
    console.error('Failed to read .env:', error);
    res.status(500).json({ error: 'Failed to read environment configurations.' });
  }
});

// PUT /api/settings/env (Admin only)
router.put('/env', authenticate, authorize('admin'), (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid updates payload.' });
    }

    if (!fs.existsSync(envPath)) {
      return res.status(404).json({ error: '.env file not found.' });
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or append keys
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, envContent);
    
    res.json({ message: 'Environment configurations updated. Server restarting...' });

    // Trigger restart
    setTimeout(() => {
      console.log('Restarting server to apply new environment configurations...');
      process.exit(0);
    }, 1000);
    
  } catch (error) {
    console.error('Failed to update .env:', error);
    res.status(500).json({ error: 'Failed to save environment configurations.' });
  }
});

// GET /api/settings/hotel
router.get('/hotel', authenticate, async (req, res) => {
  try {
    const hotelId = req.headers['x-hotel-id'];
    if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

    const settings = await db('settings').where({ hotel_id: hotelId });
    const config = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    
    // Provide defaults if not found
    if (!config.TICKET_PREFIX) config.TICKET_PREFIX = 'IT-';
    if (!config.DEFAULT_PRIORITY) config.DEFAULT_PRIORITY = 'medium';
    if (!config.ALLOW_GUEST_TICKETS) config.ALLOW_GUEST_TICKETS = 'false';

    res.json({ settings: config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotel settings.' });
  }
});

// PUT /api/settings/hotel
router.put('/hotel', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const hotelId = req.headers['x-hotel-id'];
    if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

    const { updates } = req.body;
    if (!updates) return res.status(400).json({ error: 'Updates required.' });

    for (const [key, value] of Object.entries(updates)) {
      const existing = await db('settings').where({ hotel_id: hotelId, key }).first();
      if (existing) {
        await db('settings').where({ hotel_id: hotelId, key }).update({ value: String(value), updated_at: new Date() });
      } else {
        await db('settings').insert({ hotel_id: hotelId, key, value: String(value) });
      }
    }

    res.json({ message: 'Hotel settings updated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update hotel settings.' });
  }
});

// POST /api/settings/test-email (Admin only)
router.post('/test-email', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email is required.' });

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
    });

    if (success) {
      res.json({ message: 'Test email sent successfully.' });
    } else {
      res.status(500).json({ error: 'Failed to send test email. Check server logs for details.' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email due to a server error.' });
  }
});

export default router;
