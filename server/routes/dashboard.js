import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { buildTicketVisibilityQuery } from '../services/ticketService.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let baseQuery = db('tickets').whereNull('deleted_at');
    if (date_from) baseQuery = baseQuery.where('created_at', '>=', `${date_from} 00:00:00`);
    if (date_to) baseQuery = baseQuery.where('created_at', '<=', `${date_to} 23:59:59`);

    // Apply visibility
    baseQuery = buildTicketVisibilityQuery(baseQuery, req.user);

    const allTickets = await baseQuery.clone().select('id', 'status', 'priority', 'sla_status', 'created_at', 'resolved_at', 'escalation_level');

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      open: allTickets.filter((t) => t.status === 'open').length,
      assigned: allTickets.filter((t) => t.status === 'assigned').length,
      in_progress: allTickets.filter((t) => t.status === 'in_progress').length,
      critical: allTickets.filter((t) => t.priority === 'critical' && !['closed', 'cancelled', 'resolved'].includes(t.status)).length,
      sla_breached: allTickets.filter((t) => t.sla_status === 'breached' && !['closed', 'cancelled'].includes(t.status)).length,
      at_risk: allTickets.filter((t) => t.sla_status === 'at_risk' && !['closed', 'cancelled'].includes(t.status)).length,
      resolved_this_week: allTickets.filter((t) => t.resolved_at && new Date(t.resolved_at) >= weekAgo).length,
      reopened: allTickets.filter((t) => t.status === 'reopened').length,
      escalated: allTickets.filter((t) => t.escalation_level > 0 && !['closed', 'cancelled', 'resolved'].includes(t.status)).length,
      total_active: allTickets.filter((t) => !['closed', 'cancelled'].includes(t.status)).length,
    };

    // Average resolution time (in hours)
    const resolvedTickets = allTickets.filter((t) => t.resolved_at && t.created_at);
    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)), 0);
      avgResolutionHours = Math.round((totalMs / resolvedTickets.length) / 3600000 * 10) / 10;
    }
    stats.avg_resolution_hours = avgResolutionHours;

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// GET /api/dashboard/charts
router.get('/charts', authenticate, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let baseFilter = (q) => {
      q = q.whereNull('tickets.deleted_at');
      if (date_from) q = q.where('tickets.created_at', '>=', date_from);
      if (date_to) q = q.where('tickets.created_at', '<=', date_to);
      return buildTicketVisibilityQuery(q, req.user);
    };

    // Tickets by status
    const byStatus = await baseFilter(db('tickets').select('status').count('* as count').groupBy('status'));

    // Tickets by priority
    const byPriority = await baseFilter(db('tickets').select('priority').count('* as count').groupBy('priority'));

    // Tickets by department
    const byDepartment = await baseFilter(
      db('tickets').select('department').count('* as count').whereNotNull('department').groupBy('department')
    );

    // Tickets by category (Grouped by parent category if it's a subcategory)
    const byCategory = await baseFilter(
      db('tickets')
        .select(db.raw('COALESCE(parent.name, categories.name) as category'), db.raw('count(*) as count'))
        .leftJoin('categories', 'tickets.category_id', 'categories.id')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .whereNotNull('tickets.category_id')
        .groupBy(db.raw('COALESCE(parent.name, categories.name)'))
    ).orderBy('count', 'desc');

    // Top 10 problem rooms
    const topRooms = await baseFilter(
      db('tickets')
        .select('rooms.room_number', db.raw('count(*) as count'))
        .join('rooms', 'tickets.room_id', 'rooms.id')
        .groupBy('rooms.room_number')
    ).orderBy('count', 'desc');

    // Top 10 problem assets
    const topAssets = await baseFilter(
      db('tickets')
        .select('assets.name as asset_name', db.raw('count(*) as count'))
        .join('assets', 'tickets.asset_id', 'assets.id')
        .groupBy('assets.name')
    ).orderBy('count', 'desc');

    // Top 10 problem room categories
    const topRoomTypes = await baseFilter(
      db('tickets')
        .select('rooms.room_type as room_type', db.raw('count(*) as count'))
        .join('rooms', 'tickets.room_id', 'rooms.id')
        .whereNotNull('rooms.room_type')
        .groupBy('rooms.room_type')
    ).orderBy('count', 'desc');

    // Technician workload
    let techWorkloadQuery = db('ticket_assignees')
      .select('users.id as user_id', 'users.full_name', db.raw('count(*) as count'))
      .join('users', 'ticket_assignees.user_id', 'users.id')
      .join('tickets', 'ticket_assignees.ticket_id', 'tickets.id')
      .whereNotIn('tickets.status', ['closed', 'cancelled'])
      .whereNull('tickets.deleted_at')
      .where('users.is_active', true);
      
    techWorkloadQuery = buildTicketVisibilityQuery(techWorkloadQuery, req.user);
    
    const techWorkload = await techWorkloadQuery
      .groupBy('users.id', 'users.full_name')
      .orderBy('count', 'desc');

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Check dialect to support both postgres and sqlite (for local testing)
    const isPg = db.client.config.client === 'pg' || db.client.config.client === 'postgresql';
    const monthFormat = isPg ? "to_char(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)";
    
    let monthlyTrendQuery = db('tickets')
      .select(db.raw(`${monthFormat} as month`), db.raw('count(*) as count'))
      .whereNull('deleted_at')
      .where('created_at', '>=', sixMonthsAgo);
      
    monthlyTrendQuery = buildTicketVisibilityQuery(monthlyTrendQuery, req.user);
    
    const monthlyTrend = await monthlyTrendQuery
      .groupByRaw(monthFormat)
      .orderBy('month');

    // SLA compliance
    const slaCompliance = await baseFilter(
      db('tickets')
        .select('sla_status', db.raw('count(*) as count'))
        .whereNotIn('status', ['cancelled'])
        .groupBy('sla_status')
    );

    // Weekly intervention volume (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const weekFormat = isPg ? "to_char(interventions.created_at, 'IYYY-IW')" : "strftime('%Y-%W', interventions.created_at)";

    let weeklyInterventionsQuery = db('interventions')
      .select(db.raw(`${weekFormat} as week`), db.raw('count(*) as count'))
      .join('tickets', 'interventions.ticket_id', 'tickets.id')
      .where('interventions.created_at', '>=', eightWeeksAgo);
      
    weeklyInterventionsQuery = buildTicketVisibilityQuery(weeklyInterventionsQuery, req.user);
    
    const weeklyInterventions = await weeklyInterventionsQuery
      .groupByRaw(weekFormat)
      .orderBy('week');

    // PostgreSQL returns count as string (bigint); Recharts needs numbers.
    const parseCount = (rows) => rows.map(r => ({ ...r, count: parseInt(r.count, 10) || 0 }));

    res.json({
      charts: {
        byStatus: parseCount(byStatus),
        byPriority: parseCount(byPriority),
        byDepartment: parseCount(byDepartment),
        byCategory: parseCount(byCategory),
        topRooms: parseCount(topRooms),
        topAssets: parseCount(topAssets),
        topRoomTypes: parseCount(topRoomTypes),
        techWorkload: parseCount(techWorkload),
        monthlyTrend: parseCount(monthlyTrend),
        slaCompliance: parseCount(slaCompliance),
        weeklyInterventions: parseCount(weeklyInterventions),
      },
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data.' });
  }
});

export default router;
