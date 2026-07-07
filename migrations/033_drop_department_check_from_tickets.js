/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  if (knex.client.config.client === 'pg') {
    await knex.raw('ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_department_check');
    // Just in case it has a different generated name:
    const res = await knex.raw("SELECT conname FROM pg_constraint WHERE conrelid = 'tickets'::regclass AND conname LIKE '%department_check%'");
    for (const row of res.rows) {
      await knex.raw(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  if (knex.client.config.client === 'pg') {
    // Re-add constraint
    await knex.raw("ALTER TABLE tickets ADD CONSTRAINT tickets_department_check CHECK (department IN ('front_desk', 'housekeeping', 'maintenance', 'kitchen', 'finance', 'restaurant', 'management', 'IT'))");
  }
}
