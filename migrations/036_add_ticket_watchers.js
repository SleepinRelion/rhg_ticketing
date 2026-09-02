exports.up = function(knex) {
  return knex.schema.createTable('ticket_watchers', function(table) {
    table.integer('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.primary(['ticket_id', 'user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ticket_watchers');
};
