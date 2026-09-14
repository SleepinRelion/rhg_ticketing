export async function up(knex) {
  // 1. Add hotel_id to preventive_maintenance (nullable initially)
  await knex.schema.alterTable('preventive_maintenance', table => {
    table.integer('hotel_id').references('id').inTable('hotels').onDelete('CASCADE');
  });

  // 2. Backfill hotel_id from assets
  await knex.raw(`
    UPDATE preventive_maintenance
    SET hotel_id = assets.hotel_id
    FROM assets
    WHERE preventive_maintenance.asset_id = assets.id
  `);

  // 3. Make hotel_id notNullable
  await knex.schema.alterTable('preventive_maintenance', table => {
    table.integer('hotel_id').notNullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('preventive_maintenance', table => {
    table.dropColumn('hotel_id');
  });
}
