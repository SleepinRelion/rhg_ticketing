import db from '../config/database.js';

/**
 * Audit logging middleware factory.
 * Creates an audit log entry for the request.
 * Usage: auditLog('ticket_created', 'ticket')
 */
export function auditLog(action, entityType = null) {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = body?.id || req.params?.id || null;
        createAuditEntry(
          req.user?.id || null,
          action,
          entityType,
          entityId,
          req.ip,
          req.headers['user-agent'],
          { method: req.method, path: req.originalUrl }
        ).catch((err) => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Direct audit log creation function (for use in routes/services).
 */
export async function createAuditEntry(actorUserId, action, entityType, entityId, ipAddress, userAgent, metadata) {
  try {
    await db('audit_logs').insert({
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata_json: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  }
}
