export function up(knex) {
  return knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('ticket_id').unsigned().nullable().references('id').inTable('tickets').onDelete('SET NULL');
    table.string('title', 300).notNullable();
    table.text('message').notNullable();
    table.string('type', 50).notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'is_read']);
    table.index(['created_at']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('notifications');
}
