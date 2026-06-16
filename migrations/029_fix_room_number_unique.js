export async function up(knex) {
  await knex.schema.alterTable('rooms', table => {
    table.dropUnique('room_number');
    table.unique(['hotel_id', 'room_number']);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('rooms', table => {
    table.dropUnique(['hotel_id', 'room_number']);
    table.unique('room_number');
  });
}
