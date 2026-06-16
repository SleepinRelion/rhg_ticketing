export function up(knex) {
  return knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.string('action', 100).notNullable();
    table.text('old_value').nullable();
    table.text('new_value').nullable();
    table.text('note').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['ticket_id']);
    table.index(['user_id']);
    table.index(['created_at']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('activity_logs');
}
