export async function up(knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.integer('created_by').unsigned().nullable().alter();
    table.string('guest_position', 100).nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.integer('created_by').unsigned().notNullable().alter();
    table.dropColumn('guest_position');
  });
}
