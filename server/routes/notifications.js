import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('notifications').where({ user_id: req.user.id });
    
    if (req.user.activeHotelId) {
      query = query.where(function() {
        this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
      });
    }

    const notifications = await query.clone()
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    let countQuery = db('notifications').where({ user_id: req.user.id });
    if (req.user.activeHotelId) {
      countQuery = countQuery.where(function() {
        this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
      });
    }
    const [{ count }] = await countQuery.count('* as count');

    res.json({ notifications, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count) } });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    let countQuery = db('notifications').where({ user_id: req.user.id, is_read: false });
    if (req.user.activeHotelId) {
      countQuery = countQuery.where(function() {
        this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
      });
    }
    const [{ count }] = await countQuery.count('* as count');
    res.json({ count: parseInt(count) });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get count.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await db('notifications').where({ id: req.params.id, user_id: req.user.id }).update({ is_read: true });
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  try {
    let updateQuery = db('notifications').where({ user_id: req.user.id, is_read: false });
    if (req.user.activeHotelId) {
      updateQuery = updateQuery.where(function() {
        this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
      });
    }
    await updateQuery.update({ is_read: true });
    res.json({ message: 'All marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update.' });
  }
});

export default router;
