import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/saved-views
router.get('/', authenticate, async (req, res) => {
  try {
    const views = await db('saved_views').where({ user_id: req.user.id }).orderBy('name');
    res.json({ views: views.map((v) => ({ ...v, filters: JSON.parse(v.filters_json) })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved views.' });
  }
});

// POST /api/saved-views
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, filters } = req.body;
    if (!name || !filters) return res.status(400).json({ error: 'Name and filters are required.' });

    const [view] = await db('saved_views').insert({
      user_id: req.user.id,
      name,
      filters_json: JSON.stringify(filters),
      created_at: new Date(),
    }).returning('*');

    res.status(201).json({ ...view, filters: JSON.parse(view.filters_json) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save view.' });
  }
});

// DELETE /api/saved-views/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db('saved_views').where({ id: req.params.id, user_id: req.user.id }).del();
    res.json({ message: 'View deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete view.' });
  }
});

export default router;
