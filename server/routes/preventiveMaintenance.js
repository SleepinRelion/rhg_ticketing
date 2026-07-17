import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
const router = Router();
const FREQUENCY_MAP = {
  daily: d => addDays(d, 1),
  weekly: d => addWeeks(d, 1),
  biweekly: d => addWeeks(d, 2),
  monthly: d => addMonths(d, 1),
  bimonthly: d => addMonths(d, 2),
  quarterly: d => addMonths(d, 3),
  semiannual: d => addMonths(d, 6),
  annual: d => addMonths(d, 12)
};

// GET /api/preventive-maintenance
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const {
    is_active,
    asset_id
  } = req.query;
  let query = db('preventive_maintenance').select('preventive_maintenance.*', 'assets.name as asset_name', 'assets.asset_tag', 'users.full_name as assigned_to_name').join('assets', 'preventive_maintenance.asset_id', 'assets.id').leftJoin('users', 'preventive_maintenance.assigned_to', 'users.id');
  if (is_active !== undefined) query = query.where('preventive_maintenance.is_active', is_active === 'true');
  if (asset_id) query = query.where('preventive_maintenance.asset_id', asset_id);
  const schedules = await query.orderBy('next_due_date', 'asc');
  res.json({
    schedules
  });
}));

// POST /api/preventive-maintenance
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    asset_id,
    title,
    description,
    frequency,
    next_due_date,
    assigned_to
  } = req.body;
  if (!asset_id || !title || !frequency || !next_due_date) {
    return res.status(400).json({
      error: 'Asset, title, frequency, and next due date are required.'
    });
  }
  const [schedule] = await db('preventive_maintenance').insert({
    asset_id,
    title: sanitize(title),
    description: description ? sanitize(description) : null,
    frequency,
    next_due_date,
    assigned_to: assigned_to || null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('*');
  res.status(201).json(schedule);
}));

// POST /api/preventive-maintenance/:id/complete
router.post('/:id/complete', authenticate, asyncHandler(async (req, res) => {
  const schedule = await db('preventive_maintenance').where({
    id: req.params.id
  }).first();
  if (!schedule) return res.status(404).json({
    error: 'Schedule not found.'
  });
  const advanceFn = FREQUENCY_MAP[(schedule.frequency || '').toLowerCase()];
  const nextDate = advanceFn ? advanceFn(new Date(schedule.next_due_date)) : addMonths(new Date(schedule.next_due_date), 1);
  
  // Format the date using local timezone rather than UTC to avoid GMT+ offset bugs
  const formattedNextDate = format(nextDate, 'yyyy-MM-dd');

  await db('preventive_maintenance').where({
    id: req.params.id
  }).update({
    next_due_date: formattedNextDate,
    last_completed_at: new Date(),
    updated_at: new Date()
  });

  // Update asset last serviced
  await db('assets').where({
    id: schedule.asset_id
  }).update({
    last_serviced_at: new Date(),
    next_maintenance_date: formattedNextDate,
    updated_at: new Date()
  });
  const updated = await db('preventive_maintenance').where({
    id: req.params.id
  }).first();
  res.json(updated);
}));

// PUT /api/preventive-maintenance/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const allowed = ['title', 'description', 'frequency', 'next_due_date', 'assigned_to', 'is_active'];
  const updates = {
    updated_at: new Date()
  };
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = typeof req.body[f] === 'string' ? sanitize(req.body[f]) : req.body[f];
  }
  await db('preventive_maintenance').where({
    id: req.params.id
  }).update(updates);
  const schedule = await db('preventive_maintenance').where({
    id: req.params.id
  }).first();
  res.json(schedule);
}));

// DELETE /api/preventive-maintenance/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const deleted = await db('preventive_maintenance').where({
    id: req.params.id
  }).del();
  if (!deleted) return res.status(404).json({
    error: 'Schedule not found.'
  });
  res.json({
    message: 'Schedule deleted successfully.'
  });
}));
export default router;