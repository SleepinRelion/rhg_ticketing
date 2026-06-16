export function up(knex) {
  return knex.schema.createTable('checklist_templates', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().nullable().references('id').inTable('categories').onDelete('SET NULL');
    table.string('name', 200).notNullable();
    table.text('items_json').notNullable(); // JSON array of checklist item titles
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('checklist_templates');
}
