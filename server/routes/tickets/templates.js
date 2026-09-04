import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// GET /api/tickets/templates
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

  const templates = await db('ticket_templates')
    .select('ticket_templates.*', 'categories.name as category_name', 'users.full_name as default_assignee_name')
    .leftJoin('categories', 'ticket_templates.category_id', 'categories.id')
    .leftJoin('users', 'ticket_templates.default_assignee_id', 'users.id')
    .where('ticket_templates.hotel_id', hotelId)
    .where('ticket_templates.is_active', true)
    .orderBy('ticket_templates.name', 'asc');

  res.json({ templates });
}));

// POST /api/tickets/templates
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

  const { name, title, description_template, category_id, priority, default_assignee_id } = req.body;

  const [template] = await db('ticket_templates').insert({
    hotel_id: hotelId,
    name,
    title,
    description_template,
    category_id: category_id || null,
    priority: priority || 'medium',
    default_assignee_id: default_assignee_id || null,
  }).returning('*');

  res.status(201).json({ template });
}));

// DELETE /api/tickets/templates/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

  const deleted = await db('ticket_templates')
    .where({ id: req.params.id, hotel_id: hotelId })
    .del();

  if (!deleted) return res.status(404).json({ error: 'Template not found' });
  res.json({ message: 'Template deleted' });
}));

export default router;
