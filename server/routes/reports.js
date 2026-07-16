import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { toCSV } from '../utils/csvExport.js';
import { createAuditEntry } from '../middleware/auditLog.js';
const router = Router();

/**
 * Core report query logic — shared between the GET and export endpoints.
 * Avoids self-HTTP fetches to localhost which break in Docker/proxy setups.
 */
async function getReportData(type, query) {
  const {
    date_from,
    date_to,
    department,
    category_id,
    priority
  } = query;
  let data;
  const baseFilter = q => {
    if (date_from) q = q.where('tickets.created_at', '>=', date_from);
    if (date_to) q = q.where('tickets.created_at', '<=', date_to);
    if (department) q = q.where('tickets.department', department);
    if (category_id) q = q.where('tickets.category_id', category_id);
    if (priority) q = q.where('tickets.priority', priority);
    return q.whereNull('tickets.deleted_at');
  };
  switch (type) {
    case 'ticket-summary':
      data = await baseFilter(db('tickets').select('tickets.status', 'tickets.priority', db.raw('count(*) as count')).groupBy('tickets.status', 'tickets.priority')).orderBy('tickets.status');
      break;
    case 'sla':
      data = await baseFilter(db('tickets').select('tickets.priority', 'tickets.sla_status', db.raw('count(*) as count')).groupBy('tickets.priority', 'tickets.sla_status')).orderBy('tickets.priority');
      break;
    case 'technician-performance':
      data = await db('ticket_assignees').select('users.full_name', db.raw('count(distinct ticket_assignees.ticket_id) as tickets_assigned'), db.raw('count(distinct case when tickets.status in (\'resolved\', \'closed\') then tickets.id end) as tickets_resolved'), db.raw('coalesce(sum(interventions.duration_minutes), 0) as total_work_minutes')).join('users', 'ticket_assignees.user_id', 'users.id').join('tickets', 'ticket_assignees.ticket_id', 'tickets.id').leftJoin('interventions', function () {
        this.on('interventions.ticket_id', '=', 'tickets.id').andOn('interventions.technician_id', '=', 'ticket_assignees.user_id');
      }).whereNull('tickets.deleted_at').where('users.is_active', true).modify(q => {
        if (date_from) q.where('ticket_assignees.assigned_at', '>=', date_from);
        if (date_to) q.where('ticket_assignees.assigned_at', '<=', date_to);
      }).groupBy('users.full_name').orderBy('tickets_assigned', 'desc');
      break;
    case 'asset-reliability':
      data = await db('assets').select('assets.name', 'assets.asset_tag', 'assets.status', db.raw('count(distinct tickets.id) as total_tickets'), db.raw('count(distinct interventions.id) as total_interventions'), db.raw('coalesce(sum(interventions.duration_minutes), 0) as total_downtime_minutes'), db.raw('coalesce(sum(interventions.cost), 0) as total_cost')).leftJoin('tickets', function () {
        this.on('tickets.asset_id', '=', 'assets.id').andOnNull('tickets.deleted_at');
      }).leftJoin('interventions', 'interventions.ticket_id', 'tickets.id').where('assets.is_active', true).groupBy('assets.id', 'assets.name', 'assets.asset_tag', 'assets.status').orderBy('total_tickets', 'desc');
      break;
    case 'room-issue':
      data = await db('rooms').select('rooms.room_number', 'rooms.room_type', 'rooms.status', db.raw('count(distinct tickets.id) as total_tickets'), db.raw('count(distinct case when tickets.status not in (\'closed\', \'cancelled\', \'resolved\') then tickets.id end) as open_tickets')).leftJoin('tickets', function () {
        this.on('tickets.room_id', '=', 'rooms.id').andOnNull('tickets.deleted_at');
      }).where('rooms.is_active', true).groupBy('rooms.id', 'rooms.room_number', 'rooms.room_type', 'rooms.status').orderBy('total_tickets', 'desc');
      break;
    case 'department':
      data = await baseFilter(db('tickets').select('tickets.department', db.raw('count(*) as total'), db.raw('count(case when tickets.status not in (\'closed\', \'cancelled\', \'resolved\') then 1 end) as open'), db.raw('count(case when tickets.sla_status = \'breached\' then 1 end) as breached')).whereNotNull('tickets.department').groupBy('tickets.department')).orderBy('total', 'desc');
      break;
    case 'vendor':
      data = await baseFilter(db('tickets').select('tickets.vendor_name', db.raw('count(*) as total_tickets'), db.raw('coalesce(sum(tickets.actual_cost), 0) as total_cost')).where('tickets.requires_vendor', 'yes').whereNotNull('tickets.vendor_name').groupBy('tickets.vendor_name')).orderBy('total_tickets', 'desc');
      break;
    case 'cost':
      data = await baseFilter(db('tickets').select('tickets.department', db.raw('count(*) as ticket_count'), db.raw('coalesce(sum(tickets.cost_estimate), 0) as total_estimated'), db.raw('coalesce(sum(tickets.actual_cost), 0) as total_actual'), db.raw('coalesce(sum(interventions_agg.total_cost), 0) as intervention_cost')).leftJoin(db('interventions').select('ticket_id', db.raw('sum(cost) as total_cost')).groupBy('ticket_id').as('interventions_agg'), 'interventions_agg.ticket_id', 'tickets.id').groupBy('tickets.department')).orderBy('total_actual', 'desc');
      break;
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
  return {
    type,
    data,
    generated_at: new Date()
  };
}

// GET /api/reports/:type
router.get('/:type', authenticate, asyncHandler(async (req, res) => {
  const report = await getReportData(req.params.type, req.query);
  res.json({
    report
  });
}));

// GET /api/reports/:type/export
router.get('/:type/export', authenticate, asyncHandler(async (req, res) => {
  const {
    type
  } = req.params;

  // Call the shared query function directly — no HTTP round-trip to localhost
  const report = await getReportData(type, req.query);
  const csv = toCSV(report.data);
  await createAuditEntry(req.user.id, 'report_exported', 'report', null, req.ip, req.headers['user-agent'], {
    type
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=report_${type}.csv`);
  res.send(csv);
}));
export default router;