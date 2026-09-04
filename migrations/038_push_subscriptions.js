export const up = function (knex) {
  return knex.schema.createTable('push_subscriptions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.text('endpoint').notNullable();
    table.string('p256dh').notNullable();
    table.string('auth').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

export const down = function (knex) {
  return knex.schema.dropTableIfExists('push_subscriptions');
};
