export async function up(knex) {
  const departments = [
    'Front Desk',
    'Housekeeping',
    'Maintenance',
    'Food & Beverage',
    'IT Support',
    'Management',
    'Security',
    'Concierge'
  ];

  for (const name of departments) {
    const exists = await knex('departments').where({ name }).first();
    if (!exists) {
      await knex('departments').insert({ name, is_active: true });
    }
  }
}

export async function down(knex) {
  // We generally don't want to remove departments in a down migration
  // as tickets might be tied to them, but for completeness:
  // await knex('departments').whereIn('name', ['Front Desk', ...]).del();
}
