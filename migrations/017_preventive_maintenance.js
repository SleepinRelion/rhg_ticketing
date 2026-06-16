export function up(knex) {
  return knex.schema.createTable('preventive_maintenance', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').unsigned().notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.string('title', 300).notNullable();
    table.text('description').nullable();
    table.string('frequency', 20).notNullable(); // daily, weekly, biweekly, monthly, bimonthly, quarterly, semiannual, annual
    table.date('next_due_date').notNullable();
    table.integer('assigned_to').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('last_completed_at').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['asset_id']);
    table.index(['next_due_date']);
    table.index(['is_active']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('preventive_maintenance');
}
