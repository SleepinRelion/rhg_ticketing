import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
import { publicEndpointLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /api/categories
router.get('/', authenticate, async (req, res) => {
  try {
    let query = db('categories').where({ is_active: true });
    if (req.query.ticket_type) {
      query = query.where({ ticket_type: req.query.ticket_type });
    }
    const categories = await query.orderBy('name');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    const [cat] = await db('categories').insert({
      name: sanitize(name),
      description: description ? sanitize(description) : null,
      parent_id: parent_id || null,
      ticket_type: req.body.ticket_type || null,
      created_at: new Date(),
    }).returning('*');

    res.status(201).json(cat);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Category name already exists.' });
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = sanitize(req.body.name);
    if (req.body.description !== undefined) updates.description = sanitize(req.body.description);
    if (req.body.parent_id !== undefined) updates.parent_id = req.body.parent_id;
    if (req.body.ticket_type !== undefined) updates.ticket_type = req.body.ticket_type;
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;

    await db('categories').where({ id: req.params.id }).update(updates);
    const cat = await db('categories').where({ id: req.params.id }).first();
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id (Soft Delete)
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    await db('categories').where({ id: req.params.id }).update({ is_active: false });
    res.json({ message: 'Category deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// GET /api/tags
router.get('/tags', authenticate, async (req, res) => {
  try {
    const tags = await db('tags').orderBy('name');
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

// POST /api/categories/tags
router.post('/tags', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    const [tag] = await db('tags').insert({
      name: sanitize(name),
      color: color || '#6B7280',
      created_at: new Date(),
    }).returning('*');

    res.status(201).json(tag);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Tag name already exists.' });
    res.status(500).json({ error: 'Failed to create tag.' });
  }
});

// DELETE /api/categories/tags/:id
router.delete('/tags/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Actually delete the tag or soft delete. Tags don't have is_active, maybe delete it.
    await db('tags').where({ id: req.params.id }).del();
    res.json({ message: 'Tag deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tag. It might be in use.' });
  }
});

// GET /api/categories/public - Get all active categories for guest portal
router.get('/public', publicEndpointLimiter, async (req, res) => {
  try {
    let query = db('categories').where({ is_active: true }).select('id', 'name', 'parent_id', 'ticket_type');
    if (req.query.ticket_type) {
      query = query.where({ ticket_type: req.query.ticket_type });
    }
    const categories = await query.orderBy('name');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

export default router;
