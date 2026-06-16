export function up(knex) {
  return knex.schema.createTable('attachments', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').unsigned().nullable().references('id').inTable('tickets').onDelete('CASCADE');
    table.integer('intervention_id').unsigned().nullable().references('id').inTable('interventions').onDelete('CASCADE');
    table.integer('uploaded_by').unsigned().notNullable().references('id').inTable('users');
    table.string('file_name', 500).notNullable();
    table.string('storage_path', 1000).notNullable();
    table.string('file_type', 100).notNullable();
    table.integer('file_size').notNullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['ticket_id']);
    table.index(['intervention_id']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('attachments');
}
