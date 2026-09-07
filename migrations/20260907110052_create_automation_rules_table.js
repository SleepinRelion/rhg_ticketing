export const up = async function(knex) {
  const exists = await knex.schema.hasTable('automation_rules');
  if (!exists) {
    return knex.schema.createTable('automation_rules', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.jsonb('conditions').notNullable(); // { field, operator, value } array
      table.jsonb('actions').notNullable(); // { type, value } array
      table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }
};

export const down = function(knex) {
  return knex.schema.dropTableIfExists('automation_rules');
};
