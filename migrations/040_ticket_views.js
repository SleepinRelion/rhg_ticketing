export const up = function (knex) {
  return knex.schema.createTable('ticket_views', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('last_viewed_at').defaultTo(knex.fn.now());
    table.unique(['ticket_id', 'user_id']); // Each user has one view record per ticket
  });
};

export const down = function (knex) {
  return knex.schema.dropTableIfExists('ticket_views');
};
