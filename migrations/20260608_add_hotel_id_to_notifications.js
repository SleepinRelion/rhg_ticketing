/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasTable = await knex.schema.hasTable('notifications');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('notifications', 'hotel_id');
  if (!hasColumn) {
    await knex.schema.alterTable('notifications', (table) => {
      table.integer('hotel_id').unsigned().references('id').inTable('hotels').onDelete('CASCADE').nullable();
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasTable = await knex.schema.hasTable('notifications');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('notifications', 'hotel_id');
  if (hasColumn) {
    await knex.schema.alterTable('notifications', (table) => {
      table.dropColumn('hotel_id');
    });
  }
}
