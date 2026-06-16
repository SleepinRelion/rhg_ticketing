import { addMinutes, subHours, subDays } from 'date-fns';

export async function seed(knex) {
  const now = new Date();

  // Clear existing
  await knex('comments').del();
  await knex('interventions').del();
  await knex('activity_logs').del();
  await knex('ticket_tags').del();
  await knex('ticket_assignees').del();
  await knex('tickets').del();

  const tickets = [
    {
      id: 1,
      ticket_number: 'TKT-2026-0001',
      title: 'POS Terminal 1 unresponsive in Restaurant',
      description: 'The main Micros POS terminal at the restaurant bar is frozen. Staff cannot process orders or payments. Needs immediate attention as it is dinner service.',
      status: 'in_progress',
      priority: 'critical',
      category_id: 13,
      room_id: 4,
      asset_id: 6,
      created_by: 5,
      guest_impact: 'high',
      guest_room_occupied: 'unknown',
      department: 'IT',
      sla_status: 'at_risk',
      first_response_due_at: addMinutes(subHours(now, 3), 30).toISOString(),
      resolution_due_at: addMinutes(subHours(now, 3), 240).toISOString(),
      first_responded_at: subHours(now, 2.5).toISOString(),
      created_at: subHours(now, 3).toISOString(),
      updated_at: subHours(now, 1).toISOString(),
    },
    {
      id: 2,
      ticket_number: 'TKT-2026-0002',
      title: 'Guest Wi-Fi down on Floor 2',
      description: 'Multiple guests calling front desk complaining they cannot connect to the Wi-Fi on the 2nd floor. The AP seems to be offline in the controller.',
      status: 'assigned',
      priority: 'high',
      category_id: 11,
      asset_id: 5,
      created_by: 5,
      guest_impact: 'high',
      guest_room_occupied: 'unknown',
      department: 'IT',
      sla_status: 'on_track',
      first_response_due_at: addMinutes(subHours(now, 1), 120).toISOString(),
      resolution_due_at: addMinutes(subHours(now, 1), 1440).toISOString(),
      first_responded_at: subHours(now, 0.5).toISOString(),
      created_at: subHours(now, 1).toISOString(),
      updated_at: subHours(now, 0.5).toISOString(),
    },
    {
      id: 3,
      ticket_number: 'TKT-2026-0003',
      title: 'Front Desk PC #2 extremely slow',
      description: 'The workstation at Front Desk Right takes over 5 minutes to load Opera PMS. It is delaying guest check-ins.',
      status: 'open',
      priority: 'medium',
      category_id: 9,
      room_id: 1,
      asset_id: 9,
      created_by: 6,
      guest_impact: 'low',
      guest_room_occupied: 'unknown',
      department: 'IT',
      sla_status: 'on_track',
      first_response_due_at: addMinutes(subHours(now, 2), 480).toISOString(),
      resolution_due_at: addMinutes(subHours(now, 2), 4320).toISOString(),
      created_at: subHours(now, 2).toISOString(),
      updated_at: subHours(now, 2).toISOString(),
    },
    {
      id: 4,
      ticket_number: 'TKT-2026-0004',
      title: 'Cannot cast to TV in Room 101',
      description: 'Guest in Room 101 says their Netflix app is not finding the room TV for casting. I tried rebooting the TV remotely but no luck.',
      status: 'resolved',
      priority: 'medium',
      category_id: 14,
      room_id: 8,
      created_by: 5,
      guest_impact: 'medium',
      guest_room_occupied: 'yes',
      guest_name: 'Mr. Smith',
      department: 'IT',
      sla_status: 'on_track',
      first_response_due_at: addMinutes(subDays(now, 1), 480).toISOString(),
      resolution_due_at: addMinutes(subDays(now, 1), 4320).toISOString(),
      first_responded_at: subHours(now, 23).toISOString(),
      resolved_at: subHours(now, 22).toISOString(),
      created_at: subDays(now, 1).toISOString(),
      updated_at: subHours(now, 22).toISOString(),
    },
    {
      id: 5,
      ticket_number: 'TKT-2026-0005',
      title: 'Lobby Printer offline',
      description: 'The business center printer is showing offline on the network. Network cable seems plugged in but no link light.',
      status: 'waiting_for_parts',
      priority: 'medium',
      category_id: 8,
      room_id: 1,
      asset_id: 1,
      created_by: 2,
      guest_impact: 'low',
      department: 'IT',
      requires_vendor: 'yes',
      vendor_name: 'HP Support',
      cost_estimate: 150.00,
      sla_status: 'on_track',
      first_response_due_at: addMinutes(subDays(now, 2), 480).toISOString(),
      resolution_due_at: addMinutes(subDays(now, 2), 4320).toISOString(),
      first_responded_at: subDays(now, 2).toISOString(),
      created_at: subDays(now, 2).toISOString(),
      updated_at: subDays(now, 1).toISOString(),
    }
  ];

  const ticketsWithDefaults = tickets.map(t => ({
    requires_vendor: t.requires_vendor || 'no',
    out_of_order_room: 'no',
    guest_room_occupied: t.guest_room_occupied || 'unknown',
    ...t,
  }));

  await knex('tickets').insert(ticketsWithDefaults);
  try { await knex.raw("SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets))"); } catch {}

  // Assignees
  await knex('ticket_assignees').insert([
    { ticket_id: 1, user_id: 3, assigned_by: 2, assigned_at: subHours(now, 2.8).toISOString() },
    { ticket_id: 2, user_id: 4, assigned_by: 2, assigned_at: subHours(now, 0.5).toISOString() },
    { ticket_id: 4, user_id: 3, assigned_by: 2, assigned_at: subHours(now, 23.5).toISOString() },
  ]);

  // Tags on tickets
  await knex('ticket_tags').insert([
    { ticket_id: 1, tag_id: 1 }, // Urgent
    { ticket_id: 1, tag_id: 6 }, // Hardware Failure
    { ticket_id: 2, tag_id: 2 }, // Guest Impact
    { ticket_id: 2, tag_id: 9 }, // Network Outage
    { ticket_id: 5, tag_id: 7 }, // Vendor Required
  ]);

  // Activity logs
  await knex('activity_logs').insert([
    { ticket_id: 1, user_id: 5, action: 'ticket_created', new_value: 'open', created_at: subHours(now, 3).toISOString() },
    { ticket_id: 1, user_id: 2, action: 'status_changed', old_value: 'open', new_value: 'assigned', note: 'Assigned to Jean-Pierre for immediate fix', created_at: subHours(now, 2.8).toISOString() },
    { ticket_id: 1, user_id: 3, action: 'status_changed', old_value: 'assigned', new_value: 'in_progress', note: 'Heading to restaurant now', created_at: subHours(now, 2.5).toISOString() },
    { ticket_id: 4, user_id: 5, action: 'ticket_created', new_value: 'open', created_at: subDays(now, 1).toISOString() },
    { ticket_id: 4, user_id: 3, action: 'status_changed', old_value: 'assigned', new_value: 'resolved', note: 'Re-paired the Chromecast with the AP. Casting is working now.', created_at: subHours(now, 22).toISOString() },
  ]);

  // Comments
  await knex('comments').insert([
    { ticket_id: 1, user_id: 5, content: 'Restaurant manager is very upset. They are doing everything on paper.', is_internal: false, created_at: subHours(now, 2.9).toISOString() },
    { ticket_id: 1, user_id: 3, content: 'The terminal motherboard is dead. I am swapping it with the spare terminal from the back office.', is_internal: false, created_at: subHours(now, 1).toISOString() },
  ]);
}
