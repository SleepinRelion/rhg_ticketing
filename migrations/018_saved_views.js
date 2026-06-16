export function up(knex) {
  return knex.schema.createTable('saved_views', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('filters_json').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('saved_views');
}
