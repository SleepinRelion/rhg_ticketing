export function up(knex) {
  return knex.schema.createTable('ticket_assignees', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('assigned_by').unsigned().notNullable().references('id').inTable('users');
    table.datetime('assigned_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['ticket_id', 'user_id']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('ticket_assignees');
}
