import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { createTicket, updateTicketStatus, buildTicketVisibilityQuery } from '../services/ticketService.js';
import { createNotification } from '../services/notificationService.js';
import { findDuplicates } from '../services/duplicateDetection.js';
import { determineSLAStatus } from '../utils/slaCalculator.js';
import { sanitize } from '../utils/sanitize.js';
import { toCSV } from '../utils/csvExport.js';
import { createAuditEntry } from '../middleware/auditLog.js';
import { getMailTransporter, SMTP_FROM } from '../config/email.js';
import { guestTicketLimiter, publicEndpointLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function applyTicketFilters(query, filters, db, userId = null) {
  const {
    search, status, priority, sla_status, ticket_type,
    department, category_id, room_id, asset_id, assignee_id,
    created_by, date_from, date_to, month, year, tag_id, my_tickets, escalated
  } = filters;

  const operator = db.client.config.client === 'pg' ? 'ilike' : 'like';

  if (search) {
    const s = `%${search}%`;
    query = query.where(function () {
      this.where('tickets.title', operator, s)
        .orWhere('tickets.ticket_number', operator, s)
        .orWhere('tickets.description', operator, s)
        .orWhere('tickets.guest_name', operator, s);
    });
  }
  if (status) {
    const statuses = status.split(',');
    query = query.whereIn('tickets.status', statuses);
  }
  if (priority) {
    const priorities = priority.split(',');
    query = query.whereIn('tickets.priority', priorities);
  }
  if (sla_status) query = query.where('tickets.sla_status', sla_status);
  if (ticket_type) query = query.where('tickets.ticket_type', ticket_type);
  if (department) query = query.where('tickets.department', department);
  if (category_id) query = query.where('tickets.category_id', category_id);
  if (room_id) query = query.where('tickets.room_id', room_id);
  if (asset_id) query = query.where('tickets.asset_id', asset_id);
  if (created_by) query = query.where('tickets.created_by', created_by);
  if (date_from) query = query.where('tickets.created_at', '>=', `${date_from} 00:00:00`);
  if (date_to) query = query.where('tickets.created_at', '<=', `${date_to} 23:59:59`);
  if (escalated === 'true') query = query.where('tickets.escalation_level', '>', 0);
  
  if (month) {
    if (db.client.config.client === 'pg') {
      query = query.whereRaw('EXTRACT(MONTH FROM tickets.created_at) = ?', [parseInt(month, 10)]);
    } else {
      query = query.whereRaw(`strftime('%m', tickets.created_at) = ?`, [month.padStart(2, '0')]);
    }
  }
  if (year) {
    if (db.client.config.client === 'pg') {
      query = query.whereRaw('EXTRACT(YEAR FROM tickets.created_at) = ?', [parseInt(year, 10)]);
    } else {
      query = query.whereRaw(`strftime('%Y', tickets.created_at) = ?`, [year]);
    }
  }

  if (assignee_id) {
    query = query.whereIn('tickets.id',
      db('ticket_assignees').select('ticket_id').where('user_id', assignee_id)
    );
  }

  if (tag_id) {
    query = query.whereIn('tickets.id',
      db('ticket_tags').select('ticket_id').where('tag_id', tag_id)
    );
  }

  if (my_tickets && userId) {
    query = query.where(function () {
      this.where('tickets.created_by', userId)
        .orWhereIn('tickets.id', db('ticket_assignees').select('ticket_id').where('user_id', userId));
    });
  }

  return query;
}

// GET /api/tickets/years - Get available years for filtering
router.get('/years', authenticate, async (req, res) => {
  try {
    let query = db('tickets').whereNull('deleted_at');
    query = buildTicketVisibilityQuery(query, req.user);
    
    let years;
    if (db.client.config.client === 'pg') {
      const result = await query.select(db.raw('DISTINCT EXTRACT(YEAR FROM created_at) as year')).orderBy('year', 'desc');
      years = result.map(r => parseInt(r.year, 10)).filter(y => !isNaN(y));
    } else {
      const result = await query.select(db.raw("DISTINCT strftime('%Y', created_at) as year")).orderBy('year', 'desc');
      years = result.map(r => parseInt(r.year, 10)).filter(y => !isNaN(y));
    }
    
    res.json({ years });
  } catch (err) {
    console.error('Error fetching ticket years:', err);
    res.status(500).json({ error: 'Failed to fetch available years' });
  }
});

// GET /api/tickets — List with filtering, searching, pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search, status, priority, sla_status, ticket_type,
      department, category_id, room_id, asset_id, assignee_id,
      created_by, sort_by = 'created_at', sort_order = 'desc',
      date_from, date_to, month, year, tag_id,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('tickets')
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
      .whereNull('tickets.deleted_at');

    // Apply role-based visibility
    query = buildTicketVisibilityQuery(query, req.user);

    // Filters
    query = applyTicketFilters(query, req.query, db, req.user.id);

    // Count total
    const countQuery = query.clone();
    const [{ count }] = await countQuery.clearSelect().clearOrder().count('tickets.id as count');

    // Sort and paginate
    const allowedSorts = ['created_at', 'updated_at', 'priority', 'status', 'ticket_number', 'title', 'sla_status', 'ticket_type', 'department'];
    const sortField = allowedSorts.includes(sort_by) ? `tickets.${sort_by}` : 'tickets.created_at';
    const tickets = await query.orderBy(sortField, sort_order === 'asc' ? 'asc' : 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    // Get assignees for these tickets
    const ticketIds = tickets.map((t) => t.id);
    const assignees = ticketIds.length > 0
      ? await db('ticket_assignees')
          .select('ticket_assignees.*', 'users.full_name', 'users.username')
          .join('users', 'ticket_assignees.user_id', 'users.id')
          .whereIn('ticket_id', ticketIds)
      : [];

    // Get tags for these tickets
    const tags = ticketIds.length > 0
      ? await db('ticket_tags')
          .select('ticket_tags.*', 'tags.name', 'tags.color')
          .join('tags', 'ticket_tags.tag_id', 'tags.id')
          .whereIn('ticket_id', ticketIds)
      : [];

    // Attach assignees and tags to tickets
    const enrichedTickets = tickets.map((t) => ({
      ...t,
      assignees: assignees.filter((a) => a.ticket_id === t.id).map((a) => ({
        id: a.user_id, full_name: a.full_name, username: a.username,
      })),
      tags: tags.filter((tag) => tag.ticket_id === t.id).map((tag) => ({
        id: tag.tag_id, name: tag.name, color: tag.color,
      })),
    }));

    res.json({
      tickets: enrichedTickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// GET /api/tickets/export — CSV export
router.get('/export', authenticate, async (req, res) => {
  try {
    let query = db('tickets')
      .select(
        'tickets.ticket_number', 'tickets.title', 'tickets.status', 'tickets.priority',
        'tickets.sla_status', 'tickets.department', 'tickets.guest_impact',
        'tickets.guest_name', 'tickets.created_at', 'tickets.updated_at',
        'tickets.resolved_at', 'tickets.actual_cost',
        'creator.full_name as created_by_name',
        'rooms.room_number', 'assets.name as asset_name',
        'categories.name as category_name'
      )
      .leftJoin('users as creator', 'tickets.created_by', 'creator.id')
      .leftJoin('rooms', 'tickets.room_id', 'rooms.id')
      .leftJoin('assets', 'tickets.asset_id', 'assets.id')
      .leftJoin('categories', 'tickets.category_id', 'categories.id')
      .whereNull('tickets.deleted_at');

    query = buildTicketVisibilityQuery(query, req.user);
    query = applyTicketFilters(query, req.query, db, req.user.id);
    const tickets = await query.orderBy('tickets.created_at', 'desc');

    const csv = toCSV(tickets);
    await createAuditEntry(req.user.id, 'export_performed', 'ticket', null, req.ip, req.headers['user-agent'], { count: tickets.length });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets_export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export tickets.' });
  }
});

// GET /api/tickets/duplicates — Check for duplicates
router.get('/duplicates', authenticate, async (req, res) => {
  try {
    const { title, room_id, asset_id, category_id } = req.query;
    const duplicates = await findDuplicates({ title, room_id: parseInt(room_id) || null, asset_id: parseInt(asset_id) || null, category_id: parseInt(category_id) || null });
    res.json({ duplicates });
  } catch (error) {
    console.error('Duplicate check error:', error);
    res.status(500).json({ error: 'Failed to check duplicates.' });
  }
});

// GET /api/tickets/:id — Get ticket detail
router.get('/:id', authenticate, async (req, res) => {
  try {
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

    // Check visibility
    if (req.user.role === 'staff' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
    }
    if (req.user.role === 'technician' && ticket.created_by !== req.user.id) {
      const isAssigned = await db('ticket_assignees').where({ ticket_id: ticket.id, user_id: req.user.id }).first();
      if (!isAssigned) {
        return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
      }
    }

    // Get related data
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
        .join('users', 'activity_logs.user_id', 'users.id')
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

    // Filter internal comments for staff
    const filteredComments = req.user.role === 'staff'
      ? comments.filter((c) => !c.is_internal)
      : comments;

    // Build unified timeline
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
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket.' });
  }
});

// POST /api/tickets — Create ticket
router.post('/', authenticate, async (req, res) => {
  try {
    const ticket = await createTicket(req.body, req.user.id, req.user.activeHotelId);
    await createAuditEntry(req.user.id, 'ticket_created', 'ticket', ticket.id, req.ip, req.headers['user-agent'], { ticket_number: ticket.ticket_number });
    
    // Emit socket event
    if (req.io) req.io.emit('ticket:created', ticket);

    // Send email alert if critical
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
        console.log(`[Email] Critical alert sent for ${ticket.ticket_number}`);
      } catch (err) {
        console.error('Failed to send critical ticket alert:', err);
      }
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create ticket.' });
  }
});

// PUT /api/tickets/bulk
router.put('/bulk', authenticate, async (req, res) => {
  try {
    const { ticketIds, updates } = req.body;
    
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'No tickets selected.' });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided.' });
    }

    // Prepare update payload
    const payload = {};
    if (updates.status) {
      payload.status = updates.status;
      if (updates.status === 'closed') {
        payload.closed_at = new Date();
      }
    }
    if (updates.priority) payload.priority = updates.priority;
    if (updates.department) payload.department = updates.department;

    await db.transaction(async (trx) => {
      // 1. Update ticket rows if any fields changed
      if (Object.keys(payload).length > 0) {
        payload.updated_at = new Date();
        await trx('tickets').whereIn('id', ticketIds).update(payload);
      }

      // 2. Assignee updates
      if (updates.assignee_id !== undefined) {
        if (updates.assignee_id === null) {
          await trx('ticket_assignees').whereIn('ticket_id', ticketIds).del();
        } else {
          // Simplest bulk assignment: replace all assignees for these tickets with the new one
          await trx('ticket_assignees').whereIn('ticket_id', ticketIds).del();
          const newAssignees = ticketIds.map(tid => ({
            ticket_id: tid,
            user_id: updates.assignee_id,
            assigned_at: new Date()
          }));
          await trx('ticket_assignees').insert(newAssignees);
        }
      }

      // 3. Log the activity for each ticket
      const logs = ticketIds.map(tid => ({
        ticket_id: tid,
        user_id: req.user.id,
        action: 'bulk_update',
        details: JSON.stringify(updates),
        created_at: new Date()
      }));
      await trx('activity_logs').insert(logs);
    });

    res.json({ message: 'Tickets updated successfully.' });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to perform bulk update.' });
  }
});

// PUT /api/tickets/:id — Update ticket
router.put('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await db('tickets').where({ id: req.params.id }).whereNull('deleted_at').first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Permission check
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
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string' ? sanitize(req.body[field]) : req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    updates.updated_at = new Date();

    // If priority changed, recalculate SLA
    if (updates.priority && updates.priority !== ticket.priority) {
      const { calculateSLADates } = await import('../utils/slaCalculator.js');
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

    await db('activity_logs').insert({
      ticket_id: ticket.id,
      user_id: req.user.id,
      action: 'ticket_updated',
      new_value: JSON.stringify(Object.keys(updates).filter((k) => k !== 'updated_at')),
      created_at: new Date(),
    });

    await createAuditEntry(req.user.id, 'ticket_updated', 'ticket', ticket.id, req.ip, req.headers['user-agent'], { fields: Object.keys(updates) });

    const updated = await db('tickets').where({ id: req.params.id }).first();
    
    // Emit socket event
    if (req.io) req.io.emit('ticket:updated', updated);

    res.json(updated);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
});

// PUT /api/tickets/:id/status — Change status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, note, cancellation_reason } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const updated = await updateTicketStatus(req.params.id, status, req.user.id, req.user.role, note, cancellation_reason);
    
    // Emit socket event
    if (req.io) req.io.emit('ticket:updated', updated);

    res.json(updated);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update status.' });
  }
});

// POST /api/tickets/:id/assign — Assign technician
router.post('/:id/assign', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'User ID is required.' });

    const ticket = await db('tickets').where({ id: req.params.id }).whereNull('deleted_at').first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const assignee = await db('users').where({ id: user_id, is_active: true }).whereNull('deleted_at').first();
    if (!assignee) return res.status(400).json({ error: 'User not found or inactive.' });

    // Check for duplicate assignment
    const existing = await db('ticket_assignees').where({ ticket_id: ticket.id, user_id }).first();
    if (existing) return res.status(409).json({ error: 'User is already assigned to this ticket.' });

    await db('ticket_assignees').insert({
      ticket_id: ticket.id,
      user_id,
      assigned_by: req.user.id,
      assigned_at: new Date(),
    });

    // Update first_responded_at if not set
    if (!ticket.first_responded_at) {
      await db('tickets').where({ id: ticket.id }).update({
        first_responded_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Update status to assigned if still open
    if (ticket.status === 'open' || ticket.status === 'reopened') {
      await updateTicketStatus(ticket.id, 'assigned', req.user.id, req.user.role, `Assigned to ${assignee.full_name}`);
    }

    // Activity log
    await db('activity_logs').insert({
      ticket_id: ticket.id,
      user_id: req.user.id,
      action: 'assignee_added',
      new_value: assignee.full_name,
      created_at: new Date(),
    });

    // Notify assignee
    await createNotification(
      user_id,
      ticket.id,
      `You've been assigned to ${ticket.ticket_number}`,
      `You have been assigned to ticket: "${ticket.title}"`,
      'assignment',
      ticket.hotel_id
    );

    // Emit socket event
    if (req.io) {
      const updatedTicket = await db('tickets').where({ id: ticket.id }).first();
      req.io.emit('ticket:updated', updatedTicket);
    }

    res.json({ message: 'Assignee added successfully.' });
  } catch (error) {
    console.error('Assign error:', error);
    res.status(500).json({ error: 'Failed to assign user.' });
  }
});

// DELETE /api/tickets/:id/assign/:userId — Remove assignee
router.delete('/:id/assign/:userId', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const deleted = await db('ticket_assignees')
      .where({ ticket_id: req.params.id, user_id: req.params.userId })
      .del();

    if (!deleted) return res.status(404).json({ error: 'Assignment not found.' });

    await db('activity_logs').insert({
      ticket_id: parseInt(req.params.id),
      user_id: req.user.id,
      action: 'assignee_removed',
      old_value: req.params.userId,
      created_at: new Date(),
    });

    res.json({ message: 'Assignee removed.' });
  } catch (error) {
    console.error('Remove assignee error:', error);
    res.status(500).json({ error: 'Failed to remove assignee.' });
  }
});

// DELETE /api/tickets/:id — Soft delete (Admin only)
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket.' });
  }
});

// POST /api/tickets/bulk — Bulk actions
router.post('/bulk', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { ticket_ids, action, value } = req.body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return res.status(400).json({ error: 'Ticket IDs are required.' });
    }

    if (!action) return res.status(400).json({ error: 'Action is required.' });

    const results = { success: 0, failed: 0, errors: [] };

    for (const ticketId of ticket_ids) {
      try {
        switch (action) {
          case 'assign':
            if (!value) throw new Error('Assignee user_id is required.');
            const existing = await db('ticket_assignees').where({ ticket_id: ticketId, user_id: value }).first();
            if (!existing) {
              await db('ticket_assignees').insert({ ticket_id: ticketId, user_id: value, assigned_by: req.user.id, assigned_at: new Date() });
            }
            break;
          case 'change_status':
            if (!value) throw new Error('Status value is required.');
            await updateTicketStatus(ticketId, value, req.user.id, req.user.role, req.body.resolution_note || 'Bulk status change');
            break;
          case 'change_priority':
            if (!value) throw new Error('Priority value is required.');
            await db('tickets').where({ id: ticketId }).update({ priority: value, updated_at: new Date() });
            break;
          case 'add_tag':
            if (!value) throw new Error('Tag ID is required.');
            const existingTag = await db('ticket_tags').where({ ticket_id: ticketId, tag_id: value }).first();
            if (!existingTag) {
              await db('ticket_tags').insert({ ticket_id: ticketId, tag_id: value });
            }
            break;
          case 'soft_delete':
            await db('tickets').where({ id: ticketId }).update({ deleted_at: new Date(), updated_at: new Date() });
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        await db('activity_logs').insert({
          ticket_id: ticketId,
          user_id: req.user.id,
          action: `bulk_${action}`,
          new_value: String(value || ''),
          created_at: new Date(),
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ ticketId, error: err.message });
      }
    }

    await createAuditEntry(req.user.id, 'bulk_action', 'ticket', null, req.ip, req.headers['user-agent'],
      { action, ticket_count: ticket_ids.length, success: results.success });

    res.json(results);
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ error: 'Failed to perform bulk action.' });
  }
});

// POST /api/tickets/:id/tags — Add tag
router.post('/:id/tags', authenticate, async (req, res) => {
  try {
    const { tag_id } = req.body;
    if (!tag_id) return res.status(400).json({ error: 'Tag ID is required.' });

    const existing = await db('ticket_tags').where({ ticket_id: req.params.id, tag_id }).first();
    if (existing) return res.status(409).json({ error: 'Tag already added.' });

    await db('ticket_tags').insert({ ticket_id: req.params.id, tag_id });
    const tag = await db('tags').where({ id: tag_id }).first();

    await db('activity_logs').insert({
      ticket_id: parseInt(req.params.id),
      user_id: req.user.id,
      action: 'tag_added',
      new_value: tag?.name || tag_id,
      created_at: new Date(),
    });

    res.status(201).json({ message: 'Tag added.' });
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(500).json({ error: 'Failed to add tag.' });
  }
});

// DELETE /api/tickets/:id/tags/:tagId
router.delete('/:id/tags/:tagId', authenticate, async (req, res) => {
  try {
    await db('ticket_tags').where({ ticket_id: req.params.id, tag_id: req.params.tagId }).del();
    res.json({ message: 'Tag removed.' });
  } catch (error) {
    console.error('Remove tag error:', error);
    res.status(500).json({ error: 'Failed to remove tag.' });
  }
});

// POST /api/tickets/guest — Public endpoint for guest tickets
router.post('/guest', guestTicketLimiter, async (req, res) => {
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
