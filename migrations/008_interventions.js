export function up(knex) {
  return knex.schema.createTable('interventions', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('technician_id').unsigned().notNullable().references('id').inTable('users');
    table.text('description').notNullable();
    table.integer('duration_minutes').nullable();
    table.text('parts_used').nullable();
    table.decimal('cost', 12, 2).nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['ticket_id']);
    table.index(['technician_id']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('interventions');
}
