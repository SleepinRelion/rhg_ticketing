export function up(knex) {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.datetime('expires_at').notNullable();
    table.boolean('is_revoked').notNullable().defaultTo(false);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['token']);
    table.index(['expires_at']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('refresh_tokens');
}
