export function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 100).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 200).notNullable();
    table.string('role', 20).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('failed_login_attempts').notNullable().defaultTo(0);
    table.datetime('locked_until').nullable();
    table.datetime('last_login_at').nullable();
    // MFA fields
    table.boolean('mfa_enabled').notNullable().defaultTo(false);
    table.string('mfa_secret', 255).nullable();
    table.text('mfa_backup_codes').nullable(); // JSON array of hashed backup codes
    table.datetime('mfa_verified_at').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('deleted_at').nullable();

    table.index(['role']);
    table.index(['is_active']);
    table.index(['deleted_at']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('users');
}
