import bcrypt from 'bcryptjs';

export async function seed(knex) {
  // Clear all tables in reverse dependency order
  await knex('refresh_tokens').del();
  await knex('ticket_links').del();
  await knex('saved_views').del();
  await knex('preventive_maintenance').del();
  await knex('checklist_templates').del();
  await knex('checklists').del();
  await knex('ticket_knowledge_links').del();
  await knex('knowledge_base_articles').del();
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('activity_logs').del();
  await knex('attachments').del();
  await knex('comments').del();
  await knex('interventions').del();
  await knex('ticket_tags').del();
  await knex('tags').del();
  await knex('ticket_assignees').del();
  await knex('tickets').del();
  await knex('assets').del();
  await knex('rooms').del();
  await knex('categories').del();
  await knex('sla_configs').del();
  await knex('users').del();

  const hash = (pw) => bcrypt.hashSync(pw, 12);

  // Create users
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      email: 'm.sanmukhiya21@gmail.com',
      password_hash: hash('Admin@123'),
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true,
      mfa_enabled: false,
    },
    {
      id: 2,
      username: 'manager',
      email: 'manager@hotel.com',
      password_hash: hash('Manager@123'),
      full_name: 'Operations Manager',
      role: 'manager',
      is_active: true,
      mfa_enabled: false,
    },
    {
      id: 3,
      username: 'technician1',
      email: 'tech@hotel.com',
      password_hash: hash('Tech@123'),
      full_name: 'Jean-Pierre Dubois',
      role: 'technician',
      is_active: true,
      mfa_enabled: false,
    },
    {
      id: 4,
      username: 'technician2',
      email: 'tech2@hotel.com',
      password_hash: hash('Tech@123'),
      full_name: 'Rajesh Kumar',
      role: 'technician',
      is_active: true,
      mfa_enabled: false,
    },
    {
      id: 5,
      username: 'frontdesk',
      email: 'staff@hotel.com',
      password_hash: hash('Staff@123'),
      full_name: 'Marie Curie',
      role: 'staff',
      is_active: true,
      mfa_enabled: false,
    },
    {
      id: 6,
      username: 'housekeeping',
      email: 'hk@hotel.com',
      password_hash: hash('Staff@123'),
      full_name: 'Priya Naidoo',
      role: 'staff',
      is_active: true,
      mfa_enabled: false,
    },
  ]);

  // Reset sequence (PostgreSQL only, no-op on SQLite)
  try { await knex.raw("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))"); } catch {}

  // SLA Configs moved to hotels seed
}
