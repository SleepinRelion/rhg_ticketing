import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
import { publicEndpointLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /api/rooms
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, floor, room_type, search } = req.query;
    let query = db('rooms').where({ is_active: true });
    if (req.user.activeHotelId) query = query.where({ hotel_id: req.user.activeHotelId });

    if (status) query = query.where({ status });
    if (floor) query = query.where({ floor });
    if (room_type) query = query.where({ room_type });
    if (search) query = query.where('room_number', 'like', `%${search}%`);

    const rooms = await query.orderBy('room_number', 'asc');

    // Get open ticket counts for each room
    const ticketCounts = await db('tickets')
      .select('room_id')
      .count('* as count')
      .whereNotIn('status', ['closed', 'cancelled', 'resolved'])
      .whereNull('deleted_at')
      .whereNotNull('room_id')
      .groupBy('room_id');

    const countMap = {};
    ticketCounts.forEach((tc) => { countMap[tc.room_id] = parseInt(tc.count); });

    // Get the latest open ticket for each room
    const activeTickets = await db('tickets')
      .select('id', 'room_id', 'title')
      .whereNotIn('status', ['closed', 'cancelled', 'resolved'])
      .whereNull('deleted_at')
      .whereNotNull('room_id')
      .orderBy('created_at', 'desc');

    const latestTicketMap = {};
    activeTickets.forEach(t => {
      if (!latestTicketMap[t.room_id]) {
        latestTicketMap[t.room_id] = { id: t.id, title: t.title };
      }
    });

    const enrichedRooms = rooms.map((r) => ({ 
      ...r, 
      open_ticket_count: countMap[r.id] || 0,
      active_ticket: latestTicketMap[r.id] || null
    }));
    res.json({ rooms: enrichedRooms });
  } catch (error) {
    console.error('List rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
});

// GET /api/rooms/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const query = db('rooms').where({ id: req.params.id });
    if (req.user.activeHotelId) query.where({ hotel_id: req.user.activeHotelId });
    const room = await query.first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const [openTickets, closedTickets, assets] = await Promise.all([
      db('tickets')
        .select('tickets.*', 'categories.name as category_name')
        .leftJoin('categories', 'tickets.category_id', 'categories.id')
        .where({ room_id: room.id })
        .whereNotIn('status', ['closed', 'cancelled'])
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc'),
      db('tickets')
        .select('tickets.*', 'categories.name as category_name')
        .leftJoin('categories', 'tickets.category_id', 'categories.id')
        .where({ room_id: room.id })
        .whereIn('status', ['closed', 'resolved'])
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc')
        .limit(20),
      db('assets').where({ room_id: room.id, is_active: true }),
    ]);

    res.json({ room, open_tickets: openTickets, recent_closed_tickets: closedTickets, assets });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to fetch room.' });
  }
});

// POST /api/rooms
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { room_number, floor, room_type, description } = req.body;
    if (!room_number) return res.status(400).json({ error: 'Room number is required.' });

    const [room] = await db('rooms').insert({
      room_number: sanitize(room_number),
      floor: floor || null,
      room_type: room_type || null,
      hotel_id: req.user.activeHotelId,
      description: description ? sanitize(description) : null,
      status: 'available',
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*');

    res.status(201).json(room);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Room number already exists.' });
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

// PUT /api/rooms/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const updates = { updated_at: new Date() };
    const allowed = ['room_number', 'floor', 'room_type', 'status', 'description'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = typeof req.body[f] === 'string' ? sanitize(req.body[f]) : req.body[f];
    }

    const query = db('rooms').where({ id: req.params.id });
    if (req.user.activeHotelId) query.where({ hotel_id: req.user.activeHotelId });
    await query.update(updates);
    const room = await db('rooms').where({ id: req.params.id }).first();
    res.json(room);
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room.' });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || req.user.primary_hotel_id;
    await db('rooms')
      .where({ id: req.params.id, hotel_id: hotelId })
      .update({ status: 'maintenance' }); // soft delete by putting in maintenance forever or we can add is_active
    
    // Check if room has is_active column? Actually I'll just delete it, or update to maintenance. 
    // Let's actually delete it since it's a small table, or just delete it from DB and let FK constraints block it if it's in use.
    try {
      await db('rooms').where({ id: req.params.id, hotel_id: hotelId }).del();
      res.json({ message: 'Room deleted successfully.' });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT' || e.code === '23503') {
        return res.status(409).json({ error: 'Cannot delete room because it is referenced by existing tickets or assets.' });
      }
      throw e;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete room.' });
  }
});

// GET /api/rooms/public/:hotelId - Get all rooms for guest portal
router.get('/public/:hotelId', publicEndpointLimiter, async (req, res) => {
  try {
    const rooms = await db('rooms')
      .where({ hotel_id: req.params.hotelId, status: 'available' })
      .orWhere({ hotel_id: req.params.hotelId, status: 'occupied' })
      .orWhere({ hotel_id: req.params.hotelId, status: 'dirty' })
      .select('id', 'room_number', 'floor', 'room_type')
      .orderBy('room_number');
    res.json({ rooms });
  } catch (error) {
    console.error('List public rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
});

export default router;
