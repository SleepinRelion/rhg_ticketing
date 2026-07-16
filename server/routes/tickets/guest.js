import { Router } from 'express';
import db from '../../config/database.js';
import { validate } from '../../middleware/validate.js';
import { guestTicketSchema } from '../../constants/schemas.js';
import { createTicket } from '../../services/ticketService.js';
import { guestTicketLimiter, publicEndpointLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// POST /api/tickets/guest — Public endpoint for guest tickets
router.post('/guest', guestTicketLimiter, validate(guestTicketSchema), async (req, res) => {
  try {
    const { title, description, guest_name, guest_position, department, hotel_id, room_id, category_id, _phone_ext } = req.body;
    
    // Honeypot check: If the hidden field is filled, it's a bot
    if (_phone_ext) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    if (!title || !guest_name || !guest_position || !department || !hotel_id) {
      return res.status(400).json({ error: 'Title, name, position, department, and hotel are required.' });
    }

    // Payload validation (Size limits to prevent abuse)
    if (
      String(title).length > 200 ||
      String(guest_name).length > 100 ||
      String(guest_position).length > 100 ||
      (description && String(description).length > 3000)
    ) {
      return res.status(400).json({ error: 'Payload size limit exceeded for one or more fields.' });
    }

    // Check if guest tickets are allowed for this hotel
    const settings = await db('settings').where({ hotel_id, key: 'ALLOW_GUEST_TICKETS' }).first();
    if (settings && settings.value === 'false') {
      return res.status(403).json({ error: 'Guest ticketing is currently disabled for this hotel.' });
    }

    const ticketData = {
      title,
      description,
      guest_name,
      guest_position,
      department,
      room_id,
      category_id,
      priority: 'medium',
      guest_impact: 'medium',
    };

    const ticket = await createTicket(ticketData, null, hotel_id);
    
    res.status(201).json({ success: true, ticket_number: ticket.ticket_number, tracking_token: ticket.guest_tracking_token });
  } catch (error) {
    console.error('Guest ticket error:', error);
    res.status(500).json({ error: 'Failed to submit guest ticket.' });
  }
});

// GET /api/tickets/guest/track/:trackingToken — Public endpoint to track ticket status using secure token
router.get('/guest/track/:trackingToken', publicEndpointLimiter, async (req, res) => {
  try {
    const { trackingToken } = req.params;
    
    const ticket = await db('tickets')
      .select(
        'tickets.id', 'tickets.ticket_number', 'tickets.title', 'tickets.status',
        'tickets.created_at', 'tickets.priority', 'tickets.guest_tracking_token',
        'rooms.room_number', 'hotels.name as hotel_name'
      )
      .leftJoin('rooms', 'tickets.room_id', 'rooms.id')
      .leftJoin('hotels', 'rooms.hotel_id', 'hotels.id')
      .where('tickets.guest_tracking_token', trackingToken)
      .whereNull('tickets.deleted_at')
      .first();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Only get PUBLIC comments
    const comments = await db('comments')
      .select('comments.id', 'comments.content', 'comments.created_at')
      .where({ ticket_id: ticket.id, is_internal: false })
      .orderBy('created_at', 'desc');

    res.json({
      ticket: {
        ...ticket,
        comments
      }
    });
  } catch (error) {
    console.error('Guest tracking error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket status.' });
  }
});

export default router;
