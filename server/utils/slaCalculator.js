import { addMinutes, isBefore, differenceInMinutes } from 'date-fns';
import { AT_RISK_THRESHOLD } from '../config/sla.js';
import db from '../config/database.js';

/**
 * Get SLA config from database (with fallback to defaults).
 */
export async function getSLAConfig(priority, hotelId) {
  const config = await db('sla_configs').where({ priority, hotel_id: hotelId }).first();
  if (config) {
    return {
      responseMinutes: config.response_time_minutes,
      resolutionMinutes: config.resolution_time_minutes,
      escalationMinutes: config.escalation_time_minutes,
    };
  }
  // Fallback defaults
  const defaults = {
    critical: { responseMinutes: 30, resolutionMinutes: 240, escalationMinutes: 15 },
    high: { responseMinutes: 120, resolutionMinutes: 1440, escalationMinutes: 60 },
    medium: { responseMinutes: 480, resolutionMinutes: 4320, escalationMinutes: 480 },
    low: { responseMinutes: 1440, resolutionMinutes: 10080, escalationMinutes: 1440 },
  };
  return defaults[priority] || defaults.medium;
}

/**
 * Calculate SLA due dates based on creation time and priority.
 */
export async function calculateSLADates(priority, createdAt, hotelId) {
  const config = await getSLAConfig(priority, hotelId);
  const created = new Date(createdAt);

  return {
    first_response_due_at: addMinutes(created, config.responseMinutes),
    resolution_due_at: addMinutes(created, config.resolutionMinutes),
  };
}

/**
 * Determine current SLA status based on deadlines and current time.
 */
export function determineSLAStatus(ticket) {
  const now = new Date();

  // If already resolved or closed, maintain current status
  if (['resolved', 'closed', 'cancelled'].includes(ticket.status)) {
    // Check if resolution was before deadline
    if (ticket.resolved_at && ticket.resolution_due_at) {
      return isBefore(new Date(ticket.resolved_at), new Date(ticket.resolution_due_at))
        ? 'on_track'
        : 'breached';
    }
    return ticket.sla_status || 'on_track';
  }

  // Check response SLA
  if (ticket.first_response_due_at && !ticket.first_responded_at) {
    if (isBefore(new Date(ticket.first_response_due_at), now)) {
      return 'breached';
    }
  }

  // Check resolution SLA
  if (ticket.resolution_due_at) {
    const deadline = new Date(ticket.resolution_due_at);
    if (isBefore(deadline, now)) {
      return 'breached';
    }

    // Check if at risk
    const created = new Date(ticket.created_at);
    const totalMinutes = differenceInMinutes(deadline, created);
    const elapsedMinutes = differenceInMinutes(now, created);
    if (elapsedMinutes / totalMinutes >= AT_RISK_THRESHOLD) {
      return 'at_risk';
    }
  }

  return 'on_track';
}
