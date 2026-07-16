import { asyncHandler } from "../../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { statusChangeSchema } from '../../constants/schemas.js';
import { updateTicketStatus } from '../../services/ticketService.js';
import { createNotification } from '../../services/notificationService.js';
import { createAuditEntry } from '../../middleware/auditLog.js';
const router = Router();

// PUT /api/tickets/bulk
router.put('/bulk', authenticate, asyncHandler(async (req, res) => {
  const {
    ticketIds,
    updates
  } = req.body;
  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({
      error: 'No tickets selected.'
    });
  }
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: 'No updates provided.'
    });
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
  await db.transaction(async trx => {
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
  res.json({
    message: 'Tickets updated successfully.'
  });
}));

// PUT /api/tickets/:id/status — Change status
router.put('/:id/status', authenticate, validate(statusChangeSchema), asyncHandler(async (req, res) => {
  const {
    status,
    note,
    cancellation_reason
  } = req.body;
  if (!status) return res.status(400).json({
    error: 'Status is required.'
  });
  const updated = await updateTicketStatus(req.params.id, status, req.user.id, req.user.role, note, cancellation_reason);

  // Emit socket event
  if (req.io) req.io.emit('ticket:updated', updated);
  res.json(updated);
}));

// POST /api/tickets/:id/assign — Assign technician
router.post('/:id/assign', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    user_id
  } = req.body;
  if (!user_id) return res.status(400).json({
    error: 'User ID is required.'
  });
  const ticket = await db('tickets').where({
    id: req.params.id
  }).whereNull('deleted_at').first();
  if (!ticket) return res.status(404).json({
    error: 'Ticket not found.'
  });
  const assignee = await db('users').where({
    id: user_id,
    is_active: true
  }).whereNull('deleted_at').first();
  if (!assignee) return res.status(400).json({
    error: 'User not found or inactive.'
  });

  // Check for duplicate assignment
  const existing = await db('ticket_assignees').where({
    ticket_id: ticket.id,
    user_id
  }).first();
  if (existing) return res.status(409).json({
    error: 'User is already assigned to this ticket.'
  });
  await db('ticket_assignees').insert({
    ticket_id: ticket.id,
    user_id,
    assigned_by: req.user.id,
    assigned_at: new Date()
  });

  // Update first_responded_at if not set
  if (!ticket.first_responded_at) {
    await db('tickets').where({
      id: ticket.id
    }).update({
      first_responded_at: new Date(),
      updated_at: new Date()
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
    created_at: new Date()
  });

  // Notify assignee
  await createNotification(user_id, ticket.id, `You've been assigned to ${ticket.ticket_number}`, `You have been assigned to ticket: "${ticket.title}"`, 'assignment', ticket.hotel_id);

  // Emit socket event
  if (req.io) {
    const updatedTicket = await db('tickets').where({
      id: ticket.id
    }).first();
    req.io.emit('ticket:updated', updatedTicket);
  }
  res.json({
    message: 'Assignee added successfully.'
  });
}));

// DELETE /api/tickets/:id/assign/:userId — Remove assignee
router.delete('/:id/assign/:userId', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const deleted = await db('ticket_assignees').where({
    ticket_id: req.params.id,
    user_id: req.params.userId
  }).del();
  if (!deleted) return res.status(404).json({
    error: 'Assignment not found.'
  });
  await db('activity_logs').insert({
    ticket_id: parseInt(req.params.id),
    user_id: req.user.id,
    action: 'assignee_removed',
    old_value: req.params.userId,
    created_at: new Date()
  });
  res.json({
    message: 'Assignee removed.'
  });
}));

// POST /api/tickets/bulk — Bulk actions
router.post('/bulk', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    ticket_ids,
    action,
    value
  } = req.body;
  if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
    return res.status(400).json({
      error: 'Ticket IDs are required.'
    });
  }
  if (!action) return res.status(400).json({
    error: 'Action is required.'
  });
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  for (const ticketId of ticket_ids) {
    try {
      switch (action) {
        case 'assign':
          if (!value) throw new Error('Assignee user_id is required.');
          const existing = await db('ticket_assignees').where({
            ticket_id: ticketId,
            user_id: value
          }).first();
          if (!existing) {
            await db('ticket_assignees').insert({
              ticket_id: ticketId,
              user_id: value,
              assigned_by: req.user.id,
              assigned_at: new Date()
            });
          }
          break;
        case 'change_status':
          if (!value) throw new Error('Status value is required.');
          await updateTicketStatus(ticketId, value, req.user.id, req.user.role, req.body.resolution_note || 'Bulk status change');
          break;
        case 'change_priority':
          if (!value) throw new Error('Priority value is required.');
          await db('tickets').where({
            id: ticketId
          }).update({
            priority: value,
            updated_at: new Date()
          });
          break;
        case 'add_tag':
          if (!value) throw new Error('Tag ID is required.');
          const existingTag = await db('ticket_tags').where({
            ticket_id: ticketId,
            tag_id: value
          }).first();
          if (!existingTag) {
            await db('ticket_tags').insert({
              ticket_id: ticketId,
              tag_id: value
            });
          }
          break;
        case 'soft_delete':
          await db('tickets').where({
            id: ticketId
          }).update({
            deleted_at: new Date(),
            updated_at: new Date()
          });
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      await db('activity_logs').insert({
        ticket_id: ticketId,
        user_id: req.user.id,
        action: `bulk_${action}`,
        new_value: String(value || ''),
        created_at: new Date()
      });
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({
        ticketId,
        error: err.message
      });
    }
  }
  await createAuditEntry(req.user.id, 'bulk_action', 'ticket', null, req.ip, req.headers['user-agent'], {
    action,
    ticket_count: ticket_ids.length,
    success: results.success
  });
  res.json(results);
}));

// POST /api/tickets/:id/tags — Add tag
router.post('/:id/tags', authenticate, asyncHandler(async (req, res) => {
  const {
    tag_id
  } = req.body;
  if (!tag_id) return res.status(400).json({
    error: 'Tag ID is required.'
  });
  const existing = await db('ticket_tags').where({
    ticket_id: req.params.id,
    tag_id
  }).first();
  if (existing) return res.status(409).json({
    error: 'Tag already added.'
  });
  await db('ticket_tags').insert({
    ticket_id: req.params.id,
    tag_id
  });
  const tag = await db('tags').where({
    id: tag_id
  }).first();
  await db('activity_logs').insert({
    ticket_id: parseInt(req.params.id),
    user_id: req.user.id,
    action: 'tag_added',
    new_value: tag?.name || tag_id,
    created_at: new Date()
  });
  res.status(201).json({
    message: 'Tag added.'
  });
}));

// DELETE /api/tickets/:id/tags/:tagId
router.delete('/:id/tags/:tagId', authenticate, asyncHandler(async (req, res) => {
  await db('ticket_tags').where({
    ticket_id: req.params.id,
    tag_id: req.params.tagId
  }).del();
  res.json({
    message: 'Tag removed.'
  });
}));
export default router;