export function up(knex) {
  return knex.schema.createTable('checklists', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.string('title', 300).notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_completed').notNullable().defaultTo(false);
    table.integer('completed_by').unsigned().nullable().references('id').inTable('users');
    table.datetime('completed_at').nullable();

    table.index(['ticket_id']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('checklists');
}
