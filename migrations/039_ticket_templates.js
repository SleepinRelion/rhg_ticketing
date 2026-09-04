export const up = function (knex) {
  return knex.schema.createTable('ticket_templates', (table) => {
    table.increments('id').primary();
    table.integer('hotel_id').unsigned().references('id').inTable('hotels').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('title').notNullable();
    table.text('description_template');
    table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('SET NULL');
    table.string('priority');
    table.integer('default_assignee_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

export const down = function (knex) {
  return knex.schema.dropTableIfExists('ticket_templates');
};
