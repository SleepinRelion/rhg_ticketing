import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /api/automations
router.get('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const rules = await db('automation_rules').orderBy('created_at', 'desc');
  res.json({ rules });
}));

// POST /api/automations
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, conditions, actions, is_active } = req.body;
  const [rule] = await db('automation_rules').insert({
    name,
    conditions: JSON.stringify(conditions),
    actions: JSON.stringify(actions),
    is_active: is_active ?? true,
    created_by: req.user.id
  }).returning('*');
  res.status(201).json({ rule });
}));

// PUT /api/automations/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, conditions, actions, is_active } = req.body;
  const [rule] = await db('automation_rules').where({ id: req.params.id }).update({
    name,
    conditions: JSON.stringify(conditions),
    actions: JSON.stringify(actions),
    is_active,
    updated_at: new Date()
  }).returning('*');
  res.json({ rule });
}));

// DELETE /api/automations/:id
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await db('automation_rules').where({ id: req.params.id }).del();
  res.json({ message: 'Rule deleted' });
}));

export default router;
