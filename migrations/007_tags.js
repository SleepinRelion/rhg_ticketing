export function up(knex) {
  return knex.schema
    .createTable('tags', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.string('color', 7).nullable();
      table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('ticket_tags', (table) => {
      table.increments('id').primary();
      table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
      table.integer('tag_id').unsigned().notNullable().references('id').inTable('tags').onDelete('CASCADE');
      table.unique(['ticket_id', 'tag_id']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('ticket_tags')
    .dropTableIfExists('tags');
}
