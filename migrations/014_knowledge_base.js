export function up(knex) {
  return knex.schema
    .createTable('knowledge_base_articles', (table) => {
      table.increments('id').primary();
      table.string('title', 300).notNullable();
      table.integer('category_id').unsigned().nullable().references('id').inTable('categories').onDelete('SET NULL');
      table.string('asset_type', 100).nullable();
      table.text('symptoms').notNullable();
      table.text('resolution_steps').notNullable();
      table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
      table.integer('updated_by').unsigned().nullable().references('id').inTable('users');
      table.boolean('is_published').notNullable().defaultTo(true);
      table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
      table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['category_id']);
    })
    .createTable('ticket_knowledge_links', (table) => {
      table.increments('id').primary();
      table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
      table.integer('article_id').unsigned().notNullable().references('id').inTable('knowledge_base_articles').onDelete('CASCADE');
      table.integer('linked_by').unsigned().notNullable().references('id').inTable('users');
      table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['ticket_id', 'article_id']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('ticket_knowledge_links')
    .dropTableIfExists('knowledge_base_articles');
}
