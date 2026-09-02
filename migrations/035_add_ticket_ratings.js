export const up = function(knex) {
  return knex.schema.alterTable('tickets', function(table) {
    table.integer('rating').nullable();
    table.text('rating_comment').nullable();
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('tickets', function(table) {
    table.dropColumn('rating');
    table.dropColumn('rating_comment');
  });
};
