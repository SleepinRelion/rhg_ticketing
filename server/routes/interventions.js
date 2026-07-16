import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { sanitize } from '../utils/sanitize.js';
import { createNotification } from '../services/notificationService.js';
const router = Router();

// POST /api/interventions
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    ticket_id,
    description,
    duration_minutes,
    parts_used,
    cost
  } = req.body;
  if (!ticket_id || !description) return res.status(400).json({
    error: 'Ticket ID and description are required.'
  });
  const ticket = await db('tickets').where({
    id: ticket_id
  }).whereNull('deleted_at').first();
  if (!ticket) return res.status(404).json({
    error: 'Ticket not found.'
  });

  // Only assigned technicians can add interventions (or admin/manager)
  if (req.user.role === 'technician') {
    const isAssigned = await db('ticket_assignees').where({
      ticket_id,
      user_id: req.user.id
    }).first();
    if (!isAssigned) return res.status(403).json({
      error: 'You can only add interventions to tickets assigned to you.'
    });
  } else if (req.user.role === 'staff') {
    return res.status(403).json({
      error: 'Staff cannot add interventions.'
    });
  }
  const [intervention] = await db('interventions').insert({
    ticket_id,
    technician_id: req.user.id,
    description: sanitize(description),
    duration_minutes: duration_minutes || null,
    parts_used: parts_used ? sanitize(parts_used) : null,
    cost: cost || null,
    created_at: new Date()
  }).returning('*');

  // Activity log
  await db('activity_logs').insert({
    ticket_id,
    user_id: req.user.id,
    action: 'intervention_added',
    new_value: `${duration_minutes || 0} minutes`,
    created_at: new Date()
  });

  // Update asset last_serviced_at if ticket has an asset
  if (ticket.asset_id) {
    await db('assets').where({
      id: ticket.asset_id
    }).update({
      last_serviced_at: new Date(),
      updated_at: new Date()
    });
  }

  // Notify ticket creator
  if (ticket.created_by !== req.user.id) {
    await createNotification(ticket.created_by, ticket_id, `Intervention on ${ticket.ticket_number}`, `A technician has logged work on your ticket.`, 'intervention', ticket.hotel_id);
  }
  res.status(201).json(intervention);
}));

// GET /api/interventions/ticket/:ticketId
router.get('/ticket/:ticketId', authenticate, asyncHandler(async (req, res) => {
  const interventions = await db('interventions').select('interventions.*', 'users.full_name as technician_name').join('users', 'interventions.technician_id', 'users.id').where('ticket_id', req.params.ticketId).orderBy('created_at', 'desc');
  res.json({
    interventions
  });
}));

// GET /api/interventions — All interventions (for reports)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    technician_id,
    date_from,
    date_to
  } = req.query;
  let query = db('interventions').select('interventions.*', 'users.full_name as technician_name', 'tickets.ticket_number', 'tickets.title as ticket_title').join('users', 'interventions.technician_id', 'users.id').join('tickets', 'interventions.ticket_id', 'tickets.id');
  if (technician_id) query = query.where('interventions.technician_id', technician_id);
  if (date_from) query = query.where('interventions.created_at', '>=', date_from);
  if (date_to) query = query.where('interventions.created_at', '<=', date_to);
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [{
    count
  }] = await query.clone().clearSelect().clearOrder().count('interventions.id as count');
  const interventions = await query.orderBy('interventions.created_at', 'desc').limit(parseInt(limit)).offset(offset);
  res.json({
    interventions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(count)
    }
  });
}));
export default router;