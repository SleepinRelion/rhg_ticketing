import db from '../config/database.js';
import { createNotification } from './notificationService.js';
import { io } from '../index.js';

export async function processAutomations(ticketId, eventType) {
  try {
    const ticket = await db('tickets').where({ id: ticketId }).first();
    if (!ticket) return;

    // Get active rules
    const rules = await db('automation_rules').where({ is_active: true });

    for (const rule of rules) {
      let conditions = [];
      try {
        conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
      } catch(e) {}
      
      let actions = [];
      try {
        actions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions;
      } catch(e) {}

      if (!Array.isArray(conditions) || !Array.isArray(actions) || conditions.length === 0) continue;

      // Evaluate conditions (AND logic by default)
      let isMatch = true;
      for (const cond of conditions) {
        const { field, operator, value } = cond;
        const ticketValue = ticket[field];

        switch(operator) {
          case 'equals':
            if (String(ticketValue) !== String(value)) isMatch = false;
            break;
          case 'not_equals':
            if (String(ticketValue) === String(value)) isMatch = false;
            break;
          case 'contains':
            if (!String(ticketValue).includes(String(value))) isMatch = false;
            break;
          default:
            isMatch = false;
        }
        if (!isMatch) break;
      }

      if (isMatch) {
        // Execute actions
        for (const action of actions) {
          const { type, value } = action;
          
          if (type === 'assign_to') {
            const userId = parseInt(value, 10);
            if (!isNaN(userId)) {
              // Check if already assigned
              const existing = await db('ticket_assignees').where({ ticket_id: ticketId, user_id: userId }).first();
              if (!existing) {
                await db('ticket_assignees').insert({
                  ticket_id: ticketId,
                  user_id: userId,
                  assigned_at: new Date()
                });
                
                // create audit log
                await db('activity_logs').insert({
                  ticket_id: ticketId,
                  action: 'assigned',
                  new_value: String(userId),
                  note: `Auto-assigned by rule: ${rule.name}`,
                  created_at: new Date()
                });
                
                // notify user
                await createNotification(userId, ticketId, 'New Auto-Assignment', `You were automatically assigned to ticket #${ticket.ticket_number} by rule "${rule.name}".`, 'ticket_assigned', ticket.hotel_id);
              }
            }
          }
          else if (type === 'set_priority') {
            await db('tickets').where({ id: ticketId }).update({ priority: value, updated_at: new Date() });
            await db('activity_logs').insert({
              ticket_id: ticketId,
              action: 'priority_changed',
              new_value: value,
              note: `Priority auto-updated by rule: ${rule.name}`,
              created_at: new Date()
            });
          }
        }
        
        // Notify clients to refresh
        io.emit('ticket:updated', { id: ticketId });
      }
    }

  } catch (err) {
    console.error('Automation error:', err);
  }
}
