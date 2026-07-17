import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { runBackup, initializeCronJobs } from '../services/backupService.js';
import { createAuditEntry } from '../middleware/auditLog.js';
const router = Router();

// GET /api/backups/schedules
router.get('/schedules', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  const schedules = await db('backup_schedules').where({
    hotel_id: hotelId
  }).orderBy('created_at', 'desc');
  // For SQLite, JSON is just a string, so we parse it
  const parsed = schedules.map(s => ({
    ...s,
    recipients: typeof s.recipients === 'string' ? JSON.parse(s.recipients) : s.recipients
  }));
  res.json({
    schedules: parsed
  });
}));

// POST /api/backups/schedules
router.post('/schedules', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    frequency,
    recipients,
    is_active
  } = req.body;
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  if (!frequency || !['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
    return res.status(400).json({
      error: 'Valid frequency is required.'
    });
  }
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: 'At least one recipient email is required.'
    });
  }
  const [schedule] = await db('backup_schedules').insert({
    hotel_id: hotelId,
    frequency,
    recipients: JSON.stringify(recipients),
    is_active: is_active !== undefined ? is_active : true,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('*');
  await initializeCronJobs(); // Reload cron jobs
  await createAuditEntry(req.user.id, 'backup_schedule_created', 'system', schedule.id, req.ip, req.headers['user-agent'], {
    frequency
  });
  
  const parsedSchedule = {
    ...schedule,
    recipients: typeof schedule.recipients === 'string' ? JSON.parse(schedule.recipients) : schedule.recipients
  };
  
  res.status(201).json(parsedSchedule);
}));

// DELETE /api/backups/schedules/:id
router.delete('/schedules/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  await db('backup_schedules').where('id', req.params.id).del();
  await initializeCronJobs(); // Reload cron jobs
  await createAuditEntry(req.user.id, 'backup_schedule_deleted', 'system', req.params.id, req.ip, req.headers['user-agent'], {});
  res.json({
    message: 'Schedule deleted.'
  });
}));

// POST /api/backups/export
router.post('/export', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    recipients
  } = req.body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: 'At least one recipient email is required.'
    });
  }

  // Run backup async so we don't block the request if SMTP is slow
  runBackup(recipients, 'Manual').catch(err => console.error('Manual backup failed:', err));
  await createAuditEntry(req.user.id, 'manual_backup_triggered', 'system', null, req.ip, req.headers['user-agent'], {
    recipients
  });
  res.json({
    message: 'Backup export triggered. It will be emailed shortly.'
  });
}));
export default router;