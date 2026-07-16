import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { sanitize } from '../utils/sanitize.js';
import { createNotification } from '../services/notificationService.js';
const router = Router();

// GET /api/comments/ticket/:ticketId
router.get('/ticket/:ticketId', authenticate, asyncHandler(async (req, res) => {
  let query = db('comments').select('comments.*', 'users.full_name as user_name', 'users.role as user_role').join('users', 'comments.user_id', 'users.id').where('ticket_id', req.params.ticketId).orderBy('created_at', 'asc');

  // Staff can only see public comments
  if (req.user.role === 'staff') {
    query = query.where('is_internal', false);
  }
  const comments = await query;
  res.json({
    comments
  });
}));

// POST /api/comments
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    ticket_id,
    content,
    is_internal
  } = req.body;
  if (!ticket_id || !content) return res.status(400).json({
    error: 'Ticket ID and content are required.'
  });
  const ticket = await db('tickets').where({
    id: ticket_id
  }).whereNull('deleted_at').first();
  if (!ticket) return res.status(404).json({
    error: 'Ticket not found.'
  });

  // Staff can't create internal notes
  const internal = is_internal && req.user.role !== 'staff' ? true : false;
  const [comment] = await db('comments').insert({
    ticket_id,
    user_id: req.user.id,
    content: sanitize(content),
    is_internal: internal,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('*');

  // Activity log
  await db('activity_logs').insert({
    ticket_id,
    user_id: req.user.id,
    action: internal ? 'internal_note_added' : 'comment_added',
    created_at: new Date()
  });

  // Notify ticket creator (only for public comments from other users)
  if (!internal && ticket.created_by !== req.user.id) {
    await createNotification(ticket.created_by, ticket_id, `New comment on ${ticket.ticket_number}`, `${req.user.fullName || 'Someone'} commented on your ticket.`, 'comment', ticket.hotel_id);
  }

  // Notify assignees
  if (!internal) {
    const assignees = await db('ticket_assignees').where({
      ticket_id
    });
    for (const a of assignees) {
      if (a.user_id !== req.user.id) {
        await createNotification(a.user_id, ticket_id, `New comment on ${ticket.ticket_number}`, `A comment was added to a ticket assigned to you.`, 'comment', ticket.hotel_id);
      }
    }
  }
  const result = await db('comments').select('comments.*', 'users.full_name as user_name', 'users.role as user_role').join('users', 'comments.user_id', 'users.id').where('comments.id', comment.id).first();
  if (req.io) {
    req.io.emit('comment:added', result);
    // Optional: also emit a generic ticket updated event
    const updatedTicket = await db('tickets').where({
      id: ticket_id
    }).first();
    req.io.emit('ticket:updated', updatedTicket);
  }
  res.status(201).json(result);
}));
export default router;