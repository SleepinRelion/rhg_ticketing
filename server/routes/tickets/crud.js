import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createTicketSchema, updateTicketSchema } from '../../constants/schemas.js';
import { createTicket } from '../../services/ticketService.js';
import { sanitize } from '../../utils/sanitize.js';
import { createAuditEntry } from '../../middleware/auditLog.js';
import { getMailTransporter, SMTP_FROM } from '../../config/email.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import logger from '../../config/logger.js';

const router = Router();

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const ticket = await db('tickets')
    .select(
      'tickets.*',
      'creator.full_name as creator_name', 'creator.username as creator_username',
      'rooms.room_number', 'rooms.status as room_status',
      'assets.name as asset_name', 'assets.asset_tag',
      'categories.name as category_name'
    )
    .leftJoin('users as creator', 'tickets.created_by', 'creator.id')
    .leftJoin('rooms', 'tickets.room_id', 'rooms.id')
    .leftJoin('assets', 'tickets.asset_id', 'assets.id')
    .leftJoin('categories', 'tickets.category_id', 'categories.id')
    .where('tickets.id', req.params.id)
    .first();

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (ticket.deleted_at) {
    return res.status(410).json({ error: 'This ticket has been deleted.' });
  }

  if (req.user.role === 'staff' && ticket.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
  }
  if (req.user.role === 'technician' && ticket.created_by !== req.user.id) {
    const isAssigned = await db('ticket_assignees').where({ ticket_id: ticket.id, user_id: req.user.id }).first();
    if (!isAssigned) {
      return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
    }
  }

  const [assignees, tags, activityLogs, comments, checklists, attachments, linkedArticles] = await Promise.all([
    db('ticket_assignees')
      .select('ticket_assignees.*', 'users.full_name', 'users.username', 'users.avatar_url', 'assigner.full_name as assigned_by_name')
      .join('users', 'ticket_assignees.user_id', 'users.id')
      .leftJoin('users as assigner', 'ticket_assignees.assigned_by', 'assigner.id')
      .where('ticket_id', ticket.id),
    db('ticket_tags')
      .select('tags.*')
      .join('tags', 'ticket_tags.tag_id', 'tags.id')
      .where('ticket_id', ticket.id),
    db('activity_logs')
      .select('activity_logs.*', 'users.full_name as user_name')
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .where('ticket_id', ticket.id)
      .orderBy('created_at', 'desc'),
    db('comments')
      .select('comments.*', 'users.full_name as user_name', 'users.role as user_role')
      .join('users', 'comments.user_id', 'users.id')
      .where('ticket_id', ticket.id)
      .orderBy('created_at', 'asc'),
    db('checklists').where('ticket_id', ticket.id).orderBy('sort_order', 'asc'),
    db('attachments')
      .select('attachments.*', 'users.full_name as uploaded_by_name')
      .join('users', 'attachments.uploaded_by', 'users.id')
      .where('ticket_id', ticket.id)
      .orderBy('created_at', 'desc'),
    db('ticket_knowledge_links')
      .select('knowledge_base_articles.*')
      .join('knowledge_base_articles', 'ticket_knowledge_links.article_id', 'knowledge_base_articles.id')
      .where('ticket_knowledge_links.ticket_id', ticket.id),
  ]);

  const filteredComments = req.user.role === 'staff'
    ? comments.filter((c) => !c.is_internal)
    : comments;

  const timeline = [
    ...activityLogs.map(l => ({ ...l, timeline_type: 'activity_log' })),
    ...filteredComments.map(c => ({ ...c, timeline_type: 'comment' })),
    ...attachments.map(a => ({ ...a, timeline_type: 'attachment', user_id: a.uploaded_by, user_name: a.uploaded_by_name }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    ticket: {
      ...ticket,
      timeline,
      assignees: assignees.map((a) => ({
        id: a.user_id, full_name: a.full_name, username: a.username,
        assigned_by_name: a.assigned_by_name, assigned_at: a.assigned_at,
      })),
      tags,
      activity_logs: activityLogs,
      comments: filteredComments,
      checklists,
      attachments,
      linked_articles: linkedArticles,
    },
  });
}));

router.post('/', authenticate, validate(createTicketSchema), asyncHandler(async (req, res) => {
  const ticket = await createTicket(req.body, req.user.id, req.user.activeHotelId);
  await createAuditEntry(req.user.id, 'ticket_created', 'ticket', ticket.id, req.ip, req.headers['user-agent'], { ticket_number: ticket.ticket_number });
  
  if (req.io) req.io.emit('ticket:created', ticket);

  if (ticket.priority === 'critical') {
    try {
      const transporter = getMailTransporter();
      const mailOptions = {
        from: SMTP_FROM,
        to: process.env.MANAGER_EMAIL || 'managers@hotel.com',
        subject: `URGENT: Critical Ticket Created - ${ticket.ticket_number}`,
        text: `A new critical ticket has been created:\n\nTitle: ${ticket.title}\nDescription: ${ticket.description}\nDepartment: ${ticket.department}\n\nPlease review immediately in the system.`
      };
      await transporter.sendMail(mailOptions);
      logger.info(`Critical alert sent for ${ticket.ticket_number}`);
    } catch (err) {
      logger.error('Failed to send critical ticket alert:', err);
    }
  }

  res.status(201).json(ticket);
}));

router.put('/:id', authenticate, validate(updateTicketSchema), asyncHandler(async (req, res) => {
  const ticket = await db('tickets').where({ id: req.params.id }).whereNull('deleted_at').first();
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  if (req.user.role === 'staff' && ticket.created_by !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit tickets you created.' });
  }

  const allowedFields = [
    'title', 'description', 'priority', 'ticket_type', 'category_id', 'room_id', 'asset_id',
    'guest_impact', 'guest_room_occupied', 'guest_name', 'booking_reference',
    'department', 'out_of_order_room', 'requires_vendor', 'vendor_name',
    'cost_estimate', 'actual_cost', 'hotel_id'
  ];

  const updates = {};
  const changedFields = [];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      const newVal = typeof req.body[field] === 'string' ? sanitize(req.body[field]) : req.body[field];
      const oldVal = ticket[field];
      const oldNorm = (oldVal === null || oldVal === undefined || oldVal === '') ? null : String(oldVal);
      const newNorm = (newVal === null || newVal === undefined || newVal === '') ? null : String(newVal);
      if (oldNorm !== newNorm) {
        updates[field] = newVal;
        changedFields.push({ field, oldValue: oldVal, newValue: newVal });
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  updates.updated_at = new Date();

  if (updates.priority && updates.priority !== ticket.priority) {
    const { calculateSLADates } = await import('../../utils/slaCalculator.js');
    const slaDates = await calculateSLADates(updates.priority, ticket.created_at, ticket.hotel_id);
    updates.first_response_due_at = slaDates.first_response_due_at;
    updates.resolution_due_at = slaDates.resolution_due_at;

    await db('activity_logs').insert({
      ticket_id: ticket.id,
      user_id: req.user.id,
      action: 'priority_changed',
      old_value: ticket.priority,
      new_value: updates.priority,
      created_at: new Date(),
    });
  }

  await db('tickets').where({ id: req.params.id }).update(updates);

  const fieldLabelMap = {
    title: 'title', description: 'description', priority: 'priority',
    ticket_type: 'type', category_id: 'category', room_id: 'room',
    asset_id: 'asset', guest_impact: 'guest impact', guest_room_occupied: 'guest room occupied',
    guest_name: 'guest name', booking_reference: 'booking reference',
    department: 'department', out_of_order_room: 'out of order room',
    requires_vendor: 'requires vendor', vendor_name: 'vendor name',
    cost_estimate: 'cost estimate', actual_cost: 'actual cost', hotel_id: 'hotel',
  };

  for (const change of changedFields) {
    if (change.field === 'priority') continue;

    const label = fieldLabelMap[change.field] || change.field.replace(/_/g, ' ');
    await db('activity_logs').insert({
      ticket_id: ticket.id,
      user_id: req.user.id,
      action: `${label} changed`,
      old_value: change.oldValue != null ? String(change.oldValue) : null,
      new_value: change.newValue != null ? String(change.newValue) : null,
      created_at: new Date(),
    });
  }

  await createAuditEntry(req.user.id, 'ticket_updated', 'ticket', ticket.id, req.ip, req.headers['user-agent'], { fields: Object.keys(updates) });

  const updated = await db('tickets')
    .select(
      'tickets.*',
      'creator.full_name as creator_name',
      'rooms.room_number',
      'assets.name as asset_name',
      'categories.name as category_name'
    )
    .leftJoin('users as creator', 'tickets.created_by', 'creator.id')
    .leftJoin('rooms', 'tickets.room_id', 'rooms.id')
    .leftJoin('assets', 'tickets.asset_id', 'assets.id')
    .leftJoin('categories', 'tickets.category_id', 'categories.id')
    .where({ 'tickets.id': req.params.id })
    .first();
  
  if (req.io) req.io.emit('ticket:updated', updated);

  res.json(updated);
}));

router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const ticket = await db('tickets').where({ id: req.params.id }).whereNull('deleted_at').first();
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  await db('tickets').where({ id: req.params.id }).update({ deleted_at: new Date(), updated_at: new Date() });

  await db('activity_logs').insert({
    ticket_id: ticket.id,
    user_id: req.user.id,
    action: 'ticket_deleted',
    note: 'Soft deleted',
    created_at: new Date(),
  });

  await createAuditEntry(req.user.id, 'ticket_deleted', 'ticket', ticket.id, req.ip, req.headers['user-agent'], { ticket_number: ticket.ticket_number });
  res.json({ message: 'Ticket deleted.' });
}));

export default router;
