import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
const router = Router();

// GET /api/audit-logs (Admin only)
router.get('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action,
    entity_type,
    actor_user_id,
    date_from,
    date_to
  } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = db('audit_logs').select('audit_logs.*', 'users.full_name as actor_name', 'users.username as actor_username').leftJoin('users', 'audit_logs.actor_user_id', 'users.id');
  if (action) query = query.where('audit_logs.action', action);
  if (entity_type) query = query.where('audit_logs.entity_type', entity_type);
  if (actor_user_id) query = query.where('audit_logs.actor_user_id', actor_user_id);
  if (date_from) query = query.where('audit_logs.created_at', '>=', date_from);
  if (date_to) query = query.where('audit_logs.created_at', '<=', date_to);
  const [{
    count
  }] = await query.clone().clearSelect().clearOrder().count('audit_logs.id as count');
  if (req.query.export === 'true') {
    const allLogs = await query.orderBy('audit_logs.created_at', 'desc').limit(5000); // hard limit to prevent OOM
    const csvLines = [['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details'].join(',')];
    allLogs.forEach(log => {
      const date = new Date(log.created_at).toISOString();
      const actor = log.actor_name ? `"${log.actor_name} (${log.actor_username})"` : 'System';
      const action = `"${log.action}"`;
      const entityType = `"${log.entity_type}"`;
      const entityId = `"${log.entity_id || ''}"`;
      const ip = `"${log.ip_address || ''}"`;
      const details = `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`;
      csvLines.push([date, actor, action, entityType, entityId, ip, details].join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    return res.send(csvLines.join('\n'));
  }
  const logs = await query.orderBy('audit_logs.created_at', 'desc').limit(parseInt(limit)).offset(offset);
  res.json({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(count),
      totalPages: Math.ceil(parseInt(count) / parseInt(limit))
    }
  });
}));
export default router;