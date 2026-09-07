export async function up(knex) {
  const hasForcePasswordChange = await knex.schema.hasColumn('users', 'force_password_change');
  const hasAuthProvider = await knex.schema.hasColumn('users', 'auth_provider');

  await knex.schema.table('users', (table) => {
    if (!hasForcePasswordChange) {
      table.boolean('force_password_change').defaultTo(false);
    }
    if (!hasAuthProvider) {
      table.string('auth_provider', 50).defaultTo('local'); // 'local' or 'ldap'
    }
  });
}

export async function down(knex) {
  await knex.schema.table('users', (table) => {
    table.dropColumn('force_password_change');
    table.dropColumn('auth_provider');
  });
}
