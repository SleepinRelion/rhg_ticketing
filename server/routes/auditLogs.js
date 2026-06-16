import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /api/audit-logs (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, actor_user_id, date_from, date_to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('audit_logs')
      .select('audit_logs.*', 'users.full_name as actor_name', 'users.username as actor_username')
      .leftJoin('users', 'audit_logs.actor_user_id', 'users.id');

    if (action) query = query.where('audit_logs.action', action);
    if (entity_type) query = query.where('audit_logs.entity_type', entity_type);
    if (actor_user_id) query = query.where('audit_logs.actor_user_id', actor_user_id);
    if (date_from) query = query.where('audit_logs.created_at', '>=', date_from);
    if (date_to) query = query.where('audit_logs.created_at', '<=', date_to);

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('audit_logs.id as count');
    const logs = await query.orderBy('audit_logs.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({
      logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export default router;
