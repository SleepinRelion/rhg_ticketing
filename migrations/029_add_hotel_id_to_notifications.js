export function up(knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.integer('hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('CASCADE');
  });
}

export function down(knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.dropColumn('hotel_id');
  });
}
