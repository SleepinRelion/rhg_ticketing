export async function up(knex) {
  // Create settings table
  await knex.schema.createTable('settings', table => {
    table.integer('hotel_id').unsigned().notNullable().references('id').inTable('hotels').onDelete('CASCADE');
    table.string('key').notNullable();
    table.text('value').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.primary(['hotel_id', 'key']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('settings');
}
