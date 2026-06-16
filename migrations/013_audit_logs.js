export function up(knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('actor_user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.string('entity_type', 50).nullable();
    table.integer('entity_id').nullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.text('metadata_json').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['actor_user_id']);
    table.index(['action']);
    table.index(['entity_type', 'entity_id']);
    table.index(['created_at']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('audit_logs');
}
