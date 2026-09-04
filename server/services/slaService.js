import db from '../config/database.js';
import { determineSLAStatus, getSLAConfig } from '../utils/slaCalculator.js';
import { createNotification } from './notificationService.js';
import { addMinutes, isBefore } from 'date-fns';
import { ROLES } from '../constants/roles.js';

/**
 * Run SLA check on all open tickets.
 * Called periodically by the cron job.
 */
export async function runSLACheck() {
  try {
    const activeStatuses = ['open', 'assigned', 'in_progress', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest', 'reopened'];

    const tickets = await db('tickets')
      .whereIn('status', activeStatuses)
      .whereNull('deleted_at');

    for (const ticket of tickets) {
      const newSlaStatus = determineSLAStatus(ticket);

      if (newSlaStatus !== ticket.sla_status) {
        await db('tickets').where({ id: ticket.id }).update({
          sla_status: newSlaStatus,
          updated_at: new Date(),
        });

        // Notify on breach
        if (newSlaStatus === 'breached') {
          await handleSLABreach(ticket);
        }

        // Notify on at_risk
        if (newSlaStatus === 'at_risk' && ticket.sla_status === 'on_track') {
          await handleSLAAtRisk(ticket);
        }
      }

      // Check escalation rules
      await checkEscalation(ticket);
    }
  } catch (error) {
    console.error('SLA check error:', error);
  }
}

/**
 * Handle SLA breach — notify managers and ticket creator.
 */
async function handleSLABreach(ticket) {
  // Notify all managers
  const managers = await db('users').where({ role: ROLES.MANAGER, is_active: true }).whereNull('deleted_at');
  for (const manager of managers) {
    await createNotification(
      manager.id,
      ticket.id,
      `SLA Breached: ${ticket.ticket_number}`,
      `Ticket "${ticket.title}" has breached its SLA deadline. Priority: ${ticket.priority}.`,
      'sla_breach'
    );
  }

  // Notify ticket creator if one exists (guest tickets have created_by = null)
  if (ticket.created_by) {
    await createNotification(
      ticket.created_by,
      ticket.id,
      `Ticket ${ticket.ticket_number} is Overdue`,
      `Your ticket "${ticket.title}" has passed its resolution deadline.`,
      'sla_breach'
    );
  }
}

/**
 * Handle at-risk SLA — warn assignees.
 */
async function handleSLAAtRisk(ticket) {
  const assignees = await db('ticket_assignees').where({ ticket_id: ticket.id });
  for (const assignee of assignees) {
    await createNotification(
      assignee.user_id,
      ticket.id,
      `SLA At Risk: ${ticket.ticket_number}`,
      `Ticket "${ticket.title}" is approaching its SLA deadline. Please prioritize resolution.`,
      'sla_warning'
    );
  }
}

/**
 * Check escalation rules.
 */
async function checkEscalation(ticket) {
  const now = new Date();
  const config = await getSLAConfig(ticket.priority, ticket.hotel_id);

  // Only escalate if not already assigned and escalation hasn't happened
  if (ticket.status === 'open' && ticket.escalation_level === 0) {
    const escalationDeadline = addMinutes(new Date(ticket.created_at), config.escalationMinutes);

    if (isBefore(escalationDeadline, now)) {
      // Escalate to managers
      await db('tickets').where({ id: ticket.id }).update({
        escalation_level: 1,
        updated_at: new Date(),
      });

      const managers = await db('users').where({ role: ROLES.MANAGER, is_active: true }).whereNull('deleted_at');
      for (const manager of managers) {
        await createNotification(
          manager.id,
          ticket.id,
          `Escalation: ${ticket.ticket_number}`,
          `${ticket.priority.toUpperCase()} priority ticket "${ticket.title}" has not been assigned within the escalation window.`,
          'escalation'
        );
      }

      // Activity log
      await db('activity_logs').insert({
        ticket_id: ticket.id,
        user_id: null, // System
        action: 'escalated',
        new_value: 'Level 1 - Auto-escalated to managers',
        created_at: new Date(),
      });
    }
  }

  // Level 2 escalation: breached tickets escalate to admins
  if (ticket.sla_status === 'breached' && ticket.escalation_level < 2) {
    await db('tickets').where({ id: ticket.id }).update({
      escalation_level: 2,
      updated_at: new Date(),
    });

    const admins = await db('users').where({ role: ROLES.ADMIN, is_active: true }).whereNull('deleted_at');
    for (const admin of admins) {
      await createNotification(
        admin.id,
        ticket.id,
        `Critical Escalation: ${ticket.ticket_number}`,
        `Ticket "${ticket.title}" SLA has been breached and requires immediate attention.`,
        'escalation'
      );
    }
  }
}
