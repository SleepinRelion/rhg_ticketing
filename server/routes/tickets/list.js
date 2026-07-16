import { asyncHandler } from "../../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { buildTicketVisibilityQuery } from '../../services/ticketService.js';
import { findDuplicates } from '../../services/duplicateDetection.js';
import { toCSV } from '../../utils/csvExport.js';
import { createAuditEntry } from '../../middleware/auditLog.js';
const router = Router();
function applyTicketFilters(query, filters, db, userId = null) {
  const {
    search,
    status,
    priority,
    sla_status,
    ticket_type,
    department,
    category_id,
    room_id,
    asset_id,
    assignee_id,
    created_by,
    date_from,
    date_to,
    month,
    year,
    tag_id,
    my_tickets,
    escalated
  } = filters;
  const operator = db.client.config.client === 'pg' ? 'ilike' : 'like';
  if (search) {
    const s = `%${search}%`;
    query = query.where(function () {
      this.where('tickets.title', operator, s).orWhere('tickets.ticket_number', operator, s).orWhere('tickets.description', operator, s).orWhere('tickets.guest_name', operator, s);
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
  if (category_id) {
    query = query.where(function () {
      this.where('tickets.category_id', category_id).orWhereIn('tickets.category_id', db('categories').select('id').where('parent_id', category_id));
    });
  }
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
    query = query.whereIn('tickets.id', db('ticket_assignees').select('ticket_id').where('user_id', assignee_id));
  }
  if (tag_id) {
    query = query.whereIn('tickets.id', db('ticket_tags').select('ticket_id').where('tag_id', tag_id));
  }
  if (my_tickets && userId) {
    query = query.where(function () {
      this.where('tickets.created_by', userId).orWhereIn('tickets.id', db('ticket_assignees').select('ticket_id').where('user_id', userId));
    });
  }
  return query;
}

// GET /api/tickets/years - Get available years for filtering
router.get('/years', authenticate, asyncHandler(async (req, res) => {
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
  res.json({
    years
  });
}));

// GET /api/tickets — List with filtering, searching, pagination
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    priority,
    sla_status,
    ticket_type,
    department,
    category_id,
    room_id,
    asset_id,
    assignee_id,
    created_by,
    sort_by = 'created_at',
    sort_order = 'desc',
    date_from,
    date_to,
    month,
    year,
    tag_id
  } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = db('tickets').select('tickets.*', 'creator.full_name as creator_name', 'rooms.room_number', 'assets.name as asset_name', 'categories.name as category_name').leftJoin('users as creator', 'tickets.created_by', 'creator.id').leftJoin('rooms', 'tickets.room_id', 'rooms.id').leftJoin('assets', 'tickets.asset_id', 'assets.id').leftJoin('categories', 'tickets.category_id', 'categories.id').whereNull('tickets.deleted_at');

  // Apply role-based visibility
  query = buildTicketVisibilityQuery(query, req.user);

  // Filters
  query = applyTicketFilters(query, req.query, db, req.user.id);

  // Count total
  const countQuery = query.clone();
  const [{
    count
  }] = await countQuery.clearSelect().clearOrder().count('tickets.id as count');

  // Sort and paginate
  const allowedSorts = ['created_at', 'updated_at', 'priority', 'status', 'ticket_number', 'title', 'sla_status', 'ticket_type', 'department'];
  const sortField = allowedSorts.includes(sort_by) ? `tickets.${sort_by}` : 'tickets.created_at';
  const tickets = await query.orderBy(sortField, sort_order === 'asc' ? 'asc' : 'desc').limit(parseInt(limit)).offset(offset);

  // Get assignees for these tickets
  const ticketIds = tickets.map(t => t.id);
  const assignees = ticketIds.length > 0 ? await db('ticket_assignees').select('ticket_assignees.*', 'users.full_name', 'users.username').join('users', 'ticket_assignees.user_id', 'users.id').whereIn('ticket_id', ticketIds) : [];

  // Get tags for these tickets
  const tags = ticketIds.length > 0 ? await db('ticket_tags').select('ticket_tags.*', 'tags.name', 'tags.color').join('tags', 'ticket_tags.tag_id', 'tags.id').whereIn('ticket_id', ticketIds) : [];

  // Attach assignees and tags to tickets
  const enrichedTickets = tickets.map(t => ({
    ...t,
    assignees: assignees.filter(a => a.ticket_id === t.id).map(a => ({
      id: a.user_id,
      full_name: a.full_name,
      username: a.username
    })),
    tags: tags.filter(tag => tag.ticket_id === t.id).map(tag => ({
      id: tag.tag_id,
      name: tag.name,
      color: tag.color
    }))
  }));
  res.json({
    tickets: enrichedTickets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(count),
      totalPages: Math.ceil(parseInt(count) / parseInt(limit))
    }
  });
}));

// GET /api/tickets/export — CSV export
router.get('/export', authenticate, asyncHandler(async (req, res) => {
  let query = db('tickets').select('tickets.ticket_number', 'tickets.title', 'tickets.status', 'tickets.priority', 'tickets.sla_status', 'tickets.department', 'tickets.guest_impact', 'tickets.guest_name', 'tickets.created_at', 'tickets.updated_at', 'tickets.resolved_at', 'tickets.actual_cost', 'creator.full_name as created_by_name', 'rooms.room_number', 'assets.name as asset_name', 'categories.name as category_name').leftJoin('users as creator', 'tickets.created_by', 'creator.id').leftJoin('rooms', 'tickets.room_id', 'rooms.id').leftJoin('assets', 'tickets.asset_id', 'assets.id').leftJoin('categories', 'tickets.category_id', 'categories.id').whereNull('tickets.deleted_at');
  query = buildTicketVisibilityQuery(query, req.user);
  query = applyTicketFilters(query, req.query, db, req.user.id);
  const tickets = await query.orderBy('tickets.created_at', 'desc');
  const csv = toCSV(tickets);
  await createAuditEntry(req.user.id, 'export_performed', 'ticket', null, req.ip, req.headers['user-agent'], {
    count: tickets.length
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tickets_export.csv');
  res.send(csv);
}));

// GET /api/tickets/duplicates — Check for duplicates
router.get('/duplicates', authenticate, asyncHandler(async (req, res) => {
  const {
    title,
    room_id,
    asset_id,
    category_id
  } = req.query;
  const duplicates = await findDuplicates({
    title,
    room_id: parseInt(room_id) || null,
    asset_id: parseInt(asset_id) || null,
    category_id: parseInt(category_id) || null
  });
  res.json({
    duplicates
  });
}));
export default router;