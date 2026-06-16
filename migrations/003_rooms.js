export function up(knex) {
  return knex.schema.createTable('rooms', (table) => {
    table.increments('id').primary();
    table.string('room_number', 20).notNullable().unique();
    table.string('floor', 20).nullable();
    table.string('room_type', 50).nullable();
    table.string('status', 20).notNullable().defaultTo('available')
      .checkIn(['available', 'occupied', 'dirty', 'out_of_order', 'maintenance']);
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('rooms');
}
