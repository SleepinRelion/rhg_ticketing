export const up = async function(knex) {
  // Add hotel_id to automation_rules (nullable for global rules)
  const hasHotelId = await knex.schema.hasColumn('automation_rules', 'hotel_id');
  if (!hasHotelId) {
    await knex.schema.alterTable('automation_rules', table => {
      table.integer('hotel_id').references('id').inTable('hotels').onDelete('CASCADE');
    });
  }

  // Add wallpaper_url to hotels
  const hasWallpaper = await knex.schema.hasColumn('hotels', 'wallpaper_url');
  if (!hasWallpaper) {
    await knex.schema.alterTable('hotels', table => {
      table.string('wallpaper_url').nullable();
    });
  }
};

export const down = async function(knex) {
  const hasHotelId = await knex.schema.hasColumn('automation_rules', 'hotel_id');
  if (hasHotelId) {
    await knex.schema.alterTable('automation_rules', table => {
      table.dropColumn('hotel_id');
    });
  }

  const hasWallpaper = await knex.schema.hasColumn('hotels', 'wallpaper_url');
  if (hasWallpaper) {
    await knex.schema.alterTable('hotels', table => {
      table.dropColumn('wallpaper_url');
    });
  }
};
