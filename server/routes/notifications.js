import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();

// GET /api/notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20
  } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = db('notifications').where({
    user_id: req.user.id
  });
  if (req.user.activeHotelId) {
    query = query.where(function () {
      this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
    });
  }
  const notifications = await query.clone().orderBy('created_at', 'desc').limit(parseInt(limit)).offset(offset);
  let countQuery = db('notifications').where({
    user_id: req.user.id
  });
  if (req.user.activeHotelId) {
    countQuery = countQuery.where(function () {
      this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
    });
  }
  const [{
    count
  }] = await countQuery.count('* as count');
  res.json({
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(count)
    }
  });
}));

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  let countQuery = db('notifications').where({
    user_id: req.user.id,
    is_read: false
  });
  if (req.user.activeHotelId) {
    countQuery = countQuery.where(function () {
      this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
    });
  }
  const [{
    count
  }] = await countQuery.count('* as count');
  res.json({
    count: parseInt(count)
  });
}));

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  await db('notifications').where({
    id: req.params.id,
    user_id: req.user.id
  }).update({
    is_read: true
  });
  res.json({
    message: 'Marked as read.'
  });
}));

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  let updateQuery = db('notifications').where({
    user_id: req.user.id,
    is_read: false
  });
  if (req.user.activeHotelId) {
    updateQuery = updateQuery.where(function () {
      this.where('hotel_id', req.user.activeHotelId).orWhereNull('hotel_id');
    });
  }
  await updateQuery.update({
    is_read: true
  });
  res.json({
    message: 'All marked as read.'
  });
}));

// POST /api/notifications/push/subscribe
router.post('/push/subscribe', authenticate, asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Invalid subscription object.' });
  }

  // Upsert subscription
  const existing = await db('push_subscriptions').where({ endpoint, user_id: req.user.id }).first();
  if (existing) {
    await db('push_subscriptions').where({ id: existing.id }).update({
      p256dh: keys.p256dh,
      auth: keys.auth
    });
  } else {
    await db('push_subscriptions').insert({
      user_id: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth
    });
  }

  res.json({ message: 'Subscribed to push notifications.' });
}));

// DELETE /api/notifications/push/unsubscribe
router.delete('/push/unsubscribe', authenticate, asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint required.' });

  await db('push_subscriptions').where({ endpoint, user_id: req.user.id }).del();
  res.json({ message: 'Unsubscribed from push notifications.' });
}));

export default router;