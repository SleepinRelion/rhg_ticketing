export async function seed(knex) {
  // Clear existing
  await knex('categories').del();

  await knex('categories').insert([
    { id: 1, name: 'Hardware', description: 'Desktops, laptops, tablets, printers', parent_id: null },
    { id: 2, name: 'Software', description: 'PMS, POS software, Office, OS', parent_id: null },
    { id: 3, name: 'Network & Wi-Fi', description: 'Internet, Wi-Fi, switches, routers', parent_id: null },
    { id: 4, name: 'Telephony (PBX)', description: 'Desk phones, PBX server, VoIP', parent_id: null },
    { id: 5, name: 'Point of Sale (POS)', description: 'POS terminals, receipt printers', parent_id: null },
    { id: 6, name: 'Servers & Infrastructure', description: 'Server hardware, virtualization, UPS', parent_id: null },
    { id: 7, name: 'AV & Conferencing', description: 'Projectors, TVs, audio systems', parent_id: null },
    
    // Sub-categories
    { id: 8, name: 'Printer Issue', description: 'Paper jams, toner, offline', parent_id: 1 },
    { id: 9, name: 'Workstation Issue', description: 'PC won\'t boot, slow', parent_id: 1 },
    { id: 10, name: 'PMS Software', description: 'Property Management System', parent_id: 2 },
    { id: 11, name: 'Guest Wi-Fi', description: 'Guest cannot connect to Wi-Fi', parent_id: 3 },
    { id: 12, name: 'Staff Network', description: 'Staff network or VPN down', parent_id: 3 },
    { id: 13, name: 'POS Terminal Down', description: 'Terminal offline or unresponsive', parent_id: 5 },
    { id: 14, name: 'In-Room TV / Casting', description: 'TV casting issues', parent_id: 7 },
  ]);

  // Reset sequence (PostgreSQL only, no-op on SQLite)
  try { await knex.raw("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))"); } catch {}

  // Tags
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
