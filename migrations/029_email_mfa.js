export function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('email_mfa_code', 6).nullable();
    table.datetime('email_mfa_expires_at').nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_mfa_code');
    table.dropColumn('email_mfa_expires_at');
  });
}
