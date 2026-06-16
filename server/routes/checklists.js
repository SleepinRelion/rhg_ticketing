import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { sanitize } from '../utils/sanitize.js';

const router = Router();

// GET /api/checklists/ticket/:ticketId
router.get('/ticket/:ticketId', authenticate, async (req, res) => {
  try {
    const checklists = await db('checklists')
      .select('checklists.*', 'users.full_name as completed_by_name')
      .leftJoin('users', 'checklists.completed_by', 'users.id')
      .where('ticket_id', req.params.ticketId)
      .orderBy('sort_order', 'asc');
    res.json({ checklists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklists.' });
  }
});

// POST /api/checklists
router.post('/', authenticate, async (req, res) => {
  try {
    const { ticket_id, title } = req.body;
    if (!ticket_id || !title) return res.status(400).json({ error: 'Ticket ID and title are required.' });

    const maxOrder = await db('checklists').where({ ticket_id }).max('sort_order as max').first();
    const [item] = await db('checklists').insert({
      ticket_id,
      title: sanitize(title),
      sort_order: (maxOrder?.max || 0) + 1,
    }).returning('*');

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checklist item.' });
  }
});

// POST /api/checklists/from-template/:templateId
router.post('/from-template/:templateId', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.body;
    if (!ticket_id) return res.status(400).json({ error: 'Ticket ID is required.' });

    const template = await db('checklist_templates').where({ id: req.params.templateId }).first();
    if (!template) return res.status(404).json({ error: 'Template not found.' });

    const items = JSON.parse(template.items_json);
    const records = items.map((title, i) => ({
      ticket_id,
      title,
      sort_order: i + 1,
      is_completed: false,
    }));

    await db('checklists').insert(records);
    const checklists = await db('checklists').where({ ticket_id }).orderBy('sort_order');
    res.status(201).json({ checklists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply template.' });
  }
});

// PUT /api/checklists/:id/toggle
router.put('/:id/toggle', authenticate, async (req, res) => {
  try {
    const item = await db('checklists').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    const updates = {
      is_completed: !item.is_completed,
      completed_by: !item.is_completed ? req.user.id : null,
      completed_at: !item.is_completed ? new Date() : null,
    };

    await db('checklists').where({ id: req.params.id }).update(updates);
    const updated = await db('checklists')
      .select('checklists.*', 'users.full_name as completed_by_name')
      .leftJoin('users', 'checklists.completed_by', 'users.id')
      .where('checklists.id', req.params.id).first();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle checklist.' });
  }
});

// DELETE /api/checklists/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db('checklists').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

// GET /api/checklists/templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = db('checklist_templates')
      .select('checklist_templates.*', 'categories.name as category_name')
      .leftJoin('categories', 'checklist_templates.category_id', 'categories.id');

    if (category_id) query = query.where('checklist_templates.category_id', category_id);

    const templates = await query.orderBy('name');
    res.json({ templates: templates.map((t) => ({ ...t, items: JSON.parse(t.items_json) })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates.' });
  }
});

export default router;
