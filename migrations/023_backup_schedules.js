export function up(knex) {
  return knex.schema.createTable('backup_schedules', (table) => {
    table.increments('id').primary();
    table.integer('hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('CASCADE'); // null means all hotels (global)
    table.string('frequency', 20).notNullable().checkIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
    table.text('recipients').notNullable(); // JSON array of emails
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('last_run_at').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('backup_schedules');
}
