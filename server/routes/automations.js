import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /api/automations
router.get('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  let query = db('automation_rules').orderBy('created_at', 'desc');
  if (req.user.activeHotelId && req.user.activeHotelId !== 'all') {
    query = query.where(function() {
      this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
    });
  }
  const rules = await query;
  res.json({ rules });
}));

// POST /api/automations
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, conditions, actions, is_active, is_global, hotel_id } = req.body;
  
  let targetHotelId = hotel_id || req.user.activeHotelId;
  if (is_global && req.user.role === 'admin') targetHotelId = null;
  else if (!targetHotelId || targetHotelId === 'all') {
    return res.status(400).json({ error: 'Please select a specific hotel or mark as Global.' });
  }

  const [rule] = await db('automation_rules').insert({
    name,
    conditions: JSON.stringify(conditions),
    actions: JSON.stringify(actions),
    is_active: is_active ?? true,
    hotel_id: targetHotelId,
    created_by: req.user.id
  }).returning('*');
  res.status(201).json({ rule });
}));

// PUT /api/automations/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, conditions, actions, is_active, is_global, hotel_id } = req.body;
  
  const updates = {
    name,
    conditions: JSON.stringify(conditions),
    actions: JSON.stringify(actions),
    is_active,
    updated_at: new Date()
  };

  if (is_global !== undefined) {
    if (is_global && req.user.role === 'admin') updates.hotel_id = null;
    else if (hotel_id) updates.hotel_id = hotel_id;
  }

  const [rule] = await db('automation_rules').where({ id: req.params.id }).update(updates).returning('*');
  res.json({ rule });
}));

// DELETE /api/automations/:id
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await db('automation_rules').where({ id: req.params.id }).del();
  res.json({ message: 'Rule deleted' });
}));

export default router;
