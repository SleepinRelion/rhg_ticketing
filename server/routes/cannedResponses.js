import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/canned-responses
router.get('/', authenticate, asyncHandler(async (req, res) => {
  let query = db('canned_responses').select('*').orderBy('title', 'asc');
  if (req.user.activeHotelId) {
    query = query.where(function() {
      this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
    });
  } else {
    query = query.whereNull('hotel_id');
  }
  const responses = await query;
  res.json({ responses });
}));

// POST /api/canned-responses
router.post('/', authenticate, asyncHandler(async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const { title, content, hotel_id } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const [response] = await db('canned_responses').insert({
    title,
    content,
    hotel_id: hotel_id || req.user.activeHotelId || null,
    created_by: req.user.id,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('*');

  res.status(201).json(response);
}));

export default router;
