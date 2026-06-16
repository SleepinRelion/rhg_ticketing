export function up(knex) {
  return knex.schema.createTable('sla_configs', (table) => {
    table.increments('id').primary();
    table.string('priority', 10).notNullable().unique();
    table.integer('response_time_minutes').notNullable();
    table.integer('resolution_time_minutes').notNullable();
    table.integer('escalation_time_minutes').notNullable();
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('sla_configs');
}
