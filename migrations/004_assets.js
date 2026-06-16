export function up(knex) {
  return knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('asset_tag', 50).notNullable().unique();
    table.integer('category_id').unsigned().nullable().references('id').inTable('categories').onDelete('SET NULL');
    table.integer('room_id').unsigned().nullable().references('id').inTable('rooms').onDelete('SET NULL');
    table.string('location', 200).nullable();
    table.string('manufacturer', 200).nullable();
    table.string('model', 200).nullable();
    table.string('serial_number', 200).nullable();
    table.date('purchase_date').nullable();
    table.date('warranty_expiry').nullable();
    table.string('status', 30).notNullable().defaultTo('operational')
      .checkIn(['operational', 'needs_repair', 'out_of_service', 'retired']);
    table.datetime('last_serviced_at').nullable();
    table.date('next_maintenance_date').nullable();
    table.text('notes').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('assets');
}
