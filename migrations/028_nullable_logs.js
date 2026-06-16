export async function up(knex) {
  await knex.schema.alterTable('activity_logs', (table) => {
    table.integer('user_id').unsigned().nullable().alter();
  });
  await knex.schema.alterTable('audit_logs', (table) => {
    table.integer('actor_user_id').unsigned().nullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('activity_logs', (table) => {
    table.integer('user_id').unsigned().notNullable().alter();
  });
  await knex.schema.alterTable('audit_logs', (table) => {
    table.integer('actor_user_id').unsigned().notNullable().alter();
  });
}
