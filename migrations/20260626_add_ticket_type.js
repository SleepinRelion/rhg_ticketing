export async function up(knex) {
  // Add ticket_type to tickets table
  await knex.schema.alterTable('tickets', table => {
    table.string('ticket_type').defaultTo('issue'); // task, request, issue
  });

  // Add ticket_type to categories table so each category is tied to a type
  const hasCatTicketType = await knex.schema.hasColumn('categories', 'ticket_type');
  if (!hasCatTicketType) {
    await knex.schema.alterTable('categories', table => {
      table.string('ticket_type').defaultTo(null);
    });
  }

  // Add is_active to categories if not present (some DBs may already have it)
  const hasIsActive = await knex.schema.hasColumn('categories', 'is_active');
  if (!hasIsActive) {
    await knex.schema.alterTable('categories', table => {
      table.boolean('is_active').defaultTo(true);
    });
  }

  // Backfill existing tickets to 'issue' type
  await knex('tickets').whereNull('ticket_type').update({ ticket_type: 'issue' });
}

export async function down(knex) {
  await knex.schema.alterTable('tickets', table => {
    table.dropColumn('ticket_type');
  });
  // We don't drop ticket_type from categories in down to preserve data
}
