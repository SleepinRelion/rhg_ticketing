import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// GET /api/tickets/templates
// For admin/manager: returns ALL templates (active + inactive) for management UI
// For other users: returns only active templates for the create ticket form
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  const isAdmin = ['admin', 'manager'].includes(req.user.role);

  let query = db('ticket_templates')
    .select('ticket_templates.*', 'categories.name as category_name', 'users.full_name as default_assignee_name')
    .leftJoin('categories', 'ticket_templates.category_id', 'categories.id')
    .leftJoin('users', 'ticket_templates.default_assignee_id', 'users.id')
    .orderBy('ticket_templates.name', 'asc');

  // Filter by hotel if header is provided
  if (hotelId) {
    query = query.where('ticket_templates.hotel_id', hotelId);
  }

  // Non-admin users only see active templates
  if (!isAdmin || req.query.active_only === 'true') {
    query = query.where('ticket_templates.is_active', true);
  }

  const templates = await query;
  res.json({ templates });
}));

// POST /api/tickets/templates
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];

  const { name, title, description_template, category_id, priority, default_assignee_id } = req.body;

  if (!name || !title) {
    return res.status(400).json({ error: 'Template name and title are required.' });
  }

  const [template] = await db('ticket_templates').insert({
    hotel_id: hotelId || null,
    name,
    title,
    description_template: description_template || null,
    category_id: category_id || null,
    priority: priority || 'medium',
    default_assignee_id: default_assignee_id || null,
  }).returning('*');

  res.status(201).json({ template });
}));

// PUT /api/tickets/templates/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, title, description_template, category_id, priority, default_assignee_id, is_active } = req.body;

  const existing = await db('ticket_templates').where({ id: req.params.id }).first();
  if (!existing) return res.status(404).json({ error: 'Template not found.' });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (title !== undefined) updates.title = title;
  if (description_template !== undefined) updates.description_template = description_template;
  if (category_id !== undefined) updates.category_id = category_id || null;
  if (priority !== undefined) updates.priority = priority;
  if (default_assignee_id !== undefined) updates.default_assignee_id = default_assignee_id || null;
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  await db('ticket_templates').where({ id: req.params.id }).update(updates);
  const updated = await db('ticket_templates')
    .select('ticket_templates.*', 'categories.name as category_name', 'users.full_name as default_assignee_name')
    .leftJoin('categories', 'ticket_templates.category_id', 'categories.id')
    .leftJoin('users', 'ticket_templates.default_assignee_id', 'users.id')
    .where('ticket_templates.id', req.params.id)
    .first();

  res.json({ template: updated });
}));

// DELETE /api/tickets/templates/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const deleted = await db('ticket_templates')
    .where({ id: req.params.id })
    .del();

  if (!deleted) return res.status(404).json({ error: 'Template not found' });
  res.json({ message: 'Template deleted' });
}));

export default router;

