export function up(knex) {
  return knex.schema
    .createTable('hotels', (table) => {
      table.increments('id').primary();
      table.string('name', 200).notNullable();
      table.string('address', 500).nullable();
      table.string('contact_email', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
      table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    })
    .createTable('user_hotels', (table) => {
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('hotel_id').unsigned().notNullable().references('id').inTable('hotels').onDelete('CASCADE');
      table.primary(['user_id', 'hotel_id']);
    })
    .alterTable('users', (table) => {
      table.integer('primary_hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('SET NULL');
    })
    .alterTable('tickets', (table) => {
      table.integer('hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('CASCADE');
    })
    .alterTable('rooms', (table) => {
      table.integer('hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('CASCADE');
    })
    .alterTable('assets', (table) => {
      table.integer('hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('CASCADE');
    });
}

export function down(knex) {
  return knex.schema
    .alterTable('assets', (table) => {
      table.dropColumn('hotel_id');
    })
    .alterTable('rooms', (table) => {
      table.dropColumn('hotel_id');
    })
    .alterTable('tickets', (table) => {
      table.dropColumn('hotel_id');
    })
    .alterTable('users', (table) => {
      table.dropColumn('primary_hotel_id');
    })
    .dropTableIfExists('user_hotels')
    .dropTableIfExists('hotels');
}
