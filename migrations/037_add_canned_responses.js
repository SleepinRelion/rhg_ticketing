exports.up = function(knex) {
  return knex.schema.createTable('canned_responses', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.integer('hotel_id').references('id').inTable('hotels').onDelete('CASCADE').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('canned_responses');
};
