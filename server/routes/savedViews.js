import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();

// GET /api/saved-views
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const views = await db('saved_views').where({
    user_id: req.user.id
  }).orderBy('name');
  res.json({
    views: views.map(v => ({
      ...v,
      filters: JSON.parse(v.filters_json)
    }))
  });
}));

// POST /api/saved-views
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    name,
    filters
  } = req.body;
  if (!name || !filters) return res.status(400).json({
    error: 'Name and filters are required.'
  });
  const [view] = await db('saved_views').insert({
    user_id: req.user.id,
    name,
    filters_json: JSON.stringify(filters),
    created_at: new Date()
  }).returning('*');
  res.status(201).json({
    ...view,
    filters: JSON.parse(view.filters_json)
  });
}));

// DELETE /api/saved-views/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await db('saved_views').where({
    id: req.params.id,
    user_id: req.user.id
  }).del();
  res.json({
    message: 'View deleted.'
  });
}));
export default router;