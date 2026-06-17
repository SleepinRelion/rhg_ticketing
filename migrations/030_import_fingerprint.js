export function up(knex) {
  return knex.schema.alterTable('tickets', (table) => {
    // Nullable unique fingerprint for idempotent legacy imports.
    // Format: sha256(hotel_id|date|title_first80|agent_username)
    // NULL for tickets created normally (not via import).
    table.string('import_fingerprint', 64).nullable().unique();
  });
}

export function down(knex) {
  return knex.schema.alterTable('tickets', (table) => {
    table.dropColumn('import_fingerprint');
  });
}
