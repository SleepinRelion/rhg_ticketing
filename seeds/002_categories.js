export async function seed(knex) {
  // Clear existing
  await knex('categories').del();

  // === TASKS (ticket_type = 'task') — No parent categories, direct subcategories ===
  await knex('categories').insert([
    { id: 1, name: 'Daily Task', description: 'Routine daily IT tasks', ticket_type: 'task', parent_id: null, is_active: true },
    { id: 2, name: 'Server Check', description: 'Uptime, storage, performance monitoring', ticket_type: 'task', parent_id: null, is_active: true },
    { id: 3, name: 'Network Scan', description: 'Network security and vulnerability scans', ticket_type: 'task', parent_id: null, is_active: true },
    { id: 4, name: 'Backup', description: 'Data backup procedures', ticket_type: 'task', parent_id: null, is_active: true },
    { id: 5, name: 'Restoration Test', description: 'Backup restoration testing', ticket_type: 'task', parent_id: null, is_active: true },
    { id: 6, name: 'Asset Acquisition', description: 'Quote/PR/PO for new assets', ticket_type: 'task', parent_id: null, is_active: true },
  ]);

  // === REQUESTS (ticket_type = 'request') ===
  // Parent categories
  await knex('categories').insert([
    { id: 10, name: 'Account', description: 'User account management requests', ticket_type: 'request', parent_id: null, is_active: true },
    { id: 11, name: 'Asset', description: 'Hardware/device requests', ticket_type: 'request', parent_id: null, is_active: true },
  ]);
  // Subcategories
  await knex('categories').insert([
    { id: 12, name: 'User Creation', description: 'New user account setup', ticket_type: 'request', parent_id: 10, is_active: true },
    { id: 13, name: 'User Right Update', description: 'Permission/access changes', ticket_type: 'request', parent_id: 10, is_active: true },
    { id: 14, name: 'User Termination', description: 'Account deactivation/removal', ticket_type: 'request', parent_id: 10, is_active: true },
    { id: 15, name: 'Laptop Request', description: 'Request for a laptop', ticket_type: 'request', parent_id: 11, is_active: true },
    { id: 16, name: 'PC Request', description: 'Request for a desktop PC', ticket_type: 'request', parent_id: 11, is_active: true },
    { id: 17, name: 'Phone Request', description: 'Request for a phone device', ticket_type: 'request', parent_id: 11, is_active: true },
    { id: 18, name: 'Monitor Request', description: 'Request for a monitor', ticket_type: 'request', parent_id: 11, is_active: true },
    { id: 19, name: 'Other Tech Devices', description: 'Other hardware requests', ticket_type: 'request', parent_id: 11, is_active: true },
  ]);

  // === ISSUES (ticket_type = 'issue') ===
  // Parent categories
  await knex('categories').insert([
    { id: 20, name: 'Room', description: 'Room-level IT issues', ticket_type: 'issue', parent_id: null, is_active: true },
    { id: 21, name: 'Office/Dept', description: 'Office and department issues', ticket_type: 'issue', parent_id: null, is_active: true },
    { id: 22, name: 'Infra', description: 'Infrastructure-level issues', ticket_type: 'issue', parent_id: null, is_active: true },
  ]);
  // Subcategories
  await knex('categories').insert([
    { id: 23, name: 'TV Room Intervention', description: 'In-room TV issues', ticket_type: 'issue', parent_id: 20, is_active: true },
    { id: 24, name: 'Phone Intervention', description: 'In-room phone issues', ticket_type: 'issue', parent_id: 20, is_active: true },
    { id: 25, name: 'Network/Cabling Intervention', description: 'Room network/cabling issues', ticket_type: 'issue', parent_id: 20, is_active: true },
    { id: 26, name: 'PC/Laptop/Printer Intervention', description: 'Office device issues', ticket_type: 'issue', parent_id: 21, is_active: true },
    { id: 27, name: 'IPTV Issue', description: 'Backend/channels IPTV problems', ticket_type: 'issue', parent_id: 22, is_active: true },
    { id: 28, name: 'PABX Issue', description: 'PBX/telephony system issues', ticket_type: 'issue', parent_id: 22, is_active: true },
    { id: 29, name: 'Network/Switch Issue', description: 'Room block network/switch failure', ticket_type: 'issue', parent_id: 22, is_active: true },
    { id: 30, name: 'Server Issue', description: 'Server hardware or software failures', ticket_type: 'issue', parent_id: 22, is_active: true },
  ]);

  // Reset sequence (PostgreSQL only)
  try { await knex.raw("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))"); } catch {}

  // Tags — keep existing
  await knex('tags').del();
  await knex('tags').insert([
    { id: 1, name: 'Urgent', color: '#EF4444' },
    { id: 2, name: 'Guest Impact', color: '#F59E0B' },
    { id: 3, name: 'Recurring Issue', color: '#8B5CF6' },
    { id: 4, name: 'Security Incident', color: '#DC2626' },
    { id: 5, name: 'VIP Guest', color: '#F97316' },
    { id: 6, name: 'Hardware Failure', color: '#10B981' },
    { id: 7, name: 'Vendor Required', color: '#6366F1' },
    { id: 8, name: 'Preventive', color: '#06B6D4' },
    { id: 9, name: 'Network Outage', color: '#EC4899' },
    { id: 10, name: 'Compliance', color: '#EF4444' },
  ]);

  try { await knex.raw("SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags))"); } catch {}
}
