export async function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('avatar_url', 255).nullable();
  });
}

export async function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('avatar_url');
  });
}
