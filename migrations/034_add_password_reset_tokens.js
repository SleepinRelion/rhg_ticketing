export function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('reset_password_token').nullable();
    table.datetime('reset_password_expires').nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('reset_password_token');
    table.dropColumn('reset_password_expires');
  });
}
