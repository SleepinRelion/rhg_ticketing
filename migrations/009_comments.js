export function up(knex) {
  return knex.schema.createTable('comments', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.text('content').notNullable();
    table.boolean('is_internal').notNullable().defaultTo(false);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['ticket_id']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('comments');
}
