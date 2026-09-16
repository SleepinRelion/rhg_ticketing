export async function up(knex) {
  const hasPasswordChangedAt = await knex.schema.hasColumn('users', 'password_changed_at');
  
  await knex.schema.table('users', (table) => {
    if (!hasPasswordChangedAt) {
      table.timestamp('password_changed_at').defaultTo(knex.fn.now());
    }
  });

  const hasPasswordHistory = await knex.schema.hasTable('password_history');
  if (!hasPasswordHistory) {
    await knex.schema.createTable('password_history', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('password_hash', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('password_history');
  
  await knex.schema.table('users', (table) => {
    table.dropColumn('password_changed_at');
  });
}
