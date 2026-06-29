import db from '../config/database.js';
import { calculateSLADates, determineSLAStatus } from '../utils/slaCalculator.js';
import { generateTicketNumber } from '../utils/ticketNumber.js';
import { sanitize } from '../utils/sanitize.js';
import { createNotification } from './notificationService.js';

// Valid status transitions
const STATUS_TRANSITIONS = {
  open: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest', 'cancelled', 'open'],
  in_progress: ['resolved', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest', 'cancelled'],
  waiting_for_parts: ['in_progress', 'cancelled'],
  waiting_for_vendor: ['in_progress', 'cancelled'],
  waiting_for_guest: ['in_progress', 'cancelled'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'in_progress', 'cancelled'],
  cancelled: [], // Terminal state
};

// Roles that can perform certain transitions
const RESTRICTED_TRANSITIONS = {
  closed: ['admin', 'manager'], // Only admin/manager can close
  reopened: ['admin', 'manager'], // Only admin/manager can reopen
};

/**
 * Validate if a status transition is allowed.
 */
export function validateStatusTransition(currentStatus, newStatus, userRole) {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    return { valid: false, error: `Cannot transition from '${currentStatus}' to '${newStatus}'.` };
  }

  // Check role restrictions
  const requiredRoles = RESTRICTED_TRANSITIONS[newStatus];
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return { valid: false, error: `Only ${requiredRoles.join(' or ')} can change status to '${newStatus}'.` };
  }

  return { valid: true };
}

import { randomUUID } from 'crypto';

/**
 * Create a new ticket with SLA dates.
 */
export async function createTicket(data, userId, activeHotelId = null) {
  const ticketNumber = await generateTicketNumber();
  const slaDates = await calculateSLADates(data.priority, new Date(), activeHotelId);

  const ticket = {
    ticket_number: ticketNumber,
    guest_tracking_token: randomUUID(),
    title: sanitize(data.title),
    description: data.description ? sanitize(data.description) : null,
    status: 'open',
    priority: data.priority,
    ticket_type: data.ticket_type || 'issue',
    category_id: data.category_id || null,
    room_id: data.room_id || null,
    asset_id: data.asset_id || null,
    hotel_id: activeHotelId,
    created_by: userId || null,
    guest_impact: data.guest_impact || 'none',
    guest_room_occupied: data.guest_room_occupied || 'unknown',
    guest_name: data.guest_name ? sanitize(data.guest_name) : null,
    guest_position: data.guest_position ? sanitize(data.guest_position) : null,
    booking_reference: data.booking_reference ? sanitize(data.booking_reference) : null,
    department: data.department || null,
    out_of_order_room: data.out_of_order_room || 'no',
    requires_vendor: data.requires_vendor || 'no',
    vendor_name: data.vendor_name ? sanitize(data.vendor_name) : null,
    cost_estimate: data.cost_estimate || null,
    first_response_due_at: slaDates.first_response_due_at,
    resolution_due_at: slaDates.resolution_due_at,
    sla_status: 'on_track',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const [result] = await db('tickets').insert(ticket).returning('*');

  // Create activity log
  await db('activity_logs').insert({
    ticket_id: result.id,
    user_id: userId || null,
    action: 'ticket_created',
    new_value: 'open',
    created_at: new Date(),
  });

  return result;
}

/**
 * Update ticket status with workflow validation.
 */
export async function updateTicketStatus(ticketId, newStatus, userId, userRole, note, cancellationReason) {
  const ticket = await db('tickets').where({ id: ticketId }).whereNull('deleted_at').first();
  if (!ticket) {
    throw Object.assign(new Error('Ticket not found.'), { statusCode: 404 });
  }

  const validation = validateStatusTransition(ticket.status, newStatus, userRole);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.error), { statusCode: 400 });
  }

  // If cancelling, require reason
  if (newStatus === 'cancelled' && !cancellationReason) {
    throw Object.assign(new Error('A cancellation reason is required.'), { statusCode: 400 });
  }

  const updateData = {
    status: newStatus,
    updated_at: new Date(),
  };

  if (newStatus === 'cancelled') {
    updateData.cancellation_reason = sanitize(cancellationReason);
  }

  if (newStatus === 'resolved') {
    updateData.resolved_at = new Date();
  }

  if (newStatus === 'reopened') {
    updateData.resolved_at = null;
    // Recalculate SLA
    const slaDates = await calculateSLADates(ticket.priority, new Date(), ticket.hotel_id);
    updateData.resolution_due_at = slaDates.resolution_due_at;
    updateData.sla_status = 'on_track';
    updateData.escalation_level = 0;
  }

  // Update SLA status
  const updatedTicket = { ...ticket, ...updateData };
  updateData.sla_status = determineSLAStatus(updatedTicket);

  await db('tickets').where({ id: ticketId }).update(updateData);

  // Activity log
  await db('activity_logs').insert({
    ticket_id: ticketId,
    user_id: userId,
    action: 'status_changed',
    old_value: ticket.status,
    new_value: newStatus,
    note: note ? sanitize(note) : null,
    created_at: new Date(),
  });

  // Notify ticket creator
  if (ticket.created_by !== userId) {
    await createNotification(
      ticket.created_by,
      ticketId,
      `Ticket ${ticket.ticket_number} Status Updated`,
      `Status changed from ${ticket.status} to ${newStatus}`,
      'status_change',
      ticket.hotel_id
    );
  }

  // Notify assignees
  const assignees = await db('ticket_assignees').where({ ticket_id: ticketId });
  for (const assignee of assignees) {
    if (assignee.user_id !== userId) {
      await createNotification(
        assignee.user_id,
        ticketId,
        `Ticket ${ticket.ticket_number} Status Updated`,
        `Status changed from ${ticket.status} to ${newStatus}`,
        'status_change',
        ticket.hotel_id
      );
    }
  }

  return db('tickets').where({ id: ticketId }).first();
}

/**
 * Check ticket visibility based on user role and hotel context.
 */
export function buildTicketVisibilityQuery(query, user) {
  // Filter by active hotel
  if (user.activeHotelId) {
    query = query.where('tickets.hotel_id', user.activeHotelId);
  }

  if (user.role === 'admin' || user.role === 'manager') {
    // Can see all tickets in this hotel
    return query;
  }

  if (user.role === 'technician') {
    // Can see tickets assigned to them
    return query.where(function () {
      this.where('tickets.created_by', user.id)
        .orWhereIn('tickets.id', db('ticket_assignees').select('ticket_id').where('user_id', user.id));
    });
  }

  // Staff: can only see tickets they created
  return query.where('tickets.created_by', user.id);
}
