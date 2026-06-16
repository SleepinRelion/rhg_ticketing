export function up(knex) {
  return knex.schema.createTable('ticket_links', (table) => {
    table.increments('id').primary();
    table.integer('source_ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('target_ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.string('link_type', 20).notNullable(); // duplicate, related, parent_child
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['source_ticket_id', 'target_ticket_id']);
    // Prevent self-referencing links via application logic (CHECK not supported for this in all PG versions cleanly via knex)
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('ticket_links');
}
