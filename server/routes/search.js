import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// GET /api/search?q=query
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  const results = [];
  const searchPattern = `%${query}%`;

  // Search Tickets
  let ticketsQuery = db('tickets')
    .select('id', 'ticket_number', 'title', 'status', 'priority')
    .whereNull('deleted_at')
    .andWhere(function() {
      this.where('ticket_number', 'ilike', searchPattern)
          .orWhere('title', 'ilike', searchPattern)
          .orWhere('description', 'ilike', searchPattern);
    })
    .limit(5);

  if (req.user.activeHotelId) {
    ticketsQuery = ticketsQuery.where('hotel_id', req.user.activeHotelId);
  }

  const tickets = await ticketsQuery;
  tickets.forEach(t => {
    results.push({
      type: 'ticket',
      id: t.id,
      title: `${t.ticket_number}: ${t.title}`,
      subtitle: `Status: ${t.status} | Priority: ${t.priority}`,
      url: `/tickets/${t.id}`
    });
  });

  // Search Users (if manager/admin)
  if (['admin', 'manager'].includes(req.user.role)) {
    let usersQuery = db('users')
      .select('id', 'full_name', 'username', 'role')
      .where('is_active', true)
      .andWhere(function() {
        this.where('full_name', 'ilike', searchPattern)
            .orWhere('username', 'ilike', searchPattern)
            .orWhere('email', 'ilike', searchPattern);
      })
      .limit(3);

    const users = await usersQuery;
    users.forEach(u => {
      results.push({
        type: 'user',
        id: u.id,
        title: u.full_name,
        subtitle: `Role: ${u.role} | Username: ${u.username}`,
        url: `/settings?tab=users` // They can manage users here
      });
    });
  }

  // Search Rooms
  let roomsQuery = db('rooms')
    .select('id', 'room_number', 'room_type')
    .where('is_active', true)
    .andWhere(function() {
      this.where('room_number', 'ilike', searchPattern)
          .orWhere('room_type', 'ilike', searchPattern);
    })
    .limit(3);

  if (req.user.activeHotelId) {
    roomsQuery = roomsQuery.where('hotel_id', req.user.activeHotelId);
  }

  const rooms = await roomsQuery;
  rooms.forEach(r => {
    results.push({
      type: 'room',
      id: r.id,
      title: `Room ${r.room_number}`,
      subtitle: `Type: ${r.room_type}`,
      url: `/rooms`
    });
  });

  res.json({ results });
}));

export default router;
