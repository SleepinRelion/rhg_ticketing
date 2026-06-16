export async function up(knex) {
  // 1. Convert SLA configs to be hotel-specific
  const oldConfigs = await knex('sla_configs').select('*');
  const hotels = await knex('hotels').select('id');

  await knex.schema.dropTable('sla_configs');

  await knex.schema.createTable('sla_configs', (table) => {
    table.increments('id').primary();
    table.integer('hotel_id').unsigned().notNullable().references('id').inTable('hotels').onDelete('CASCADE');
    table.string('priority', 10).notNullable();
    table.integer('response_time_minutes').notNullable();
    table.integer('resolution_time_minutes').notNullable();
    table.integer('escalation_time_minutes').notNullable();
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.unique(['hotel_id', 'priority']);
  });

  const defaultConfigs = oldConfigs.length > 0 ? oldConfigs : [
    { priority: 'critical', response_time_minutes: 15, resolution_time_minutes: 60, escalation_time_minutes: 30 },
    { priority: 'high', response_time_minutes: 30, resolution_time_minutes: 120, escalation_time_minutes: 60 },
    { priority: 'medium', response_time_minutes: 60, resolution_time_minutes: 240, escalation_time_minutes: 120 },
    { priority: 'low', response_time_minutes: 120, resolution_time_minutes: 480, escalation_time_minutes: 240 }
  ];

  const newInserts = [];
  for (const hotel of hotels) {
    for (const config of defaultConfigs) {
      newInserts.push({
        hotel_id: hotel.id,
        priority: config.priority,
        response_time_minutes: config.response_time_minutes,
        resolution_time_minutes: config.resolution_time_minutes,
        escalation_time_minutes: config.escalation_time_minutes,
      });
    }
  }

  if (newInserts.length > 0) {
    await knex('sla_configs').insert(newInserts);
  }

  // 2. Remove global backup schedules (associate any NULL hotel_id backups to the first hotel if they exist, to avoid breaking logic)
  const backups = await knex('backup_schedules').whereNull('hotel_id');
  if (backups.length > 0 && hotels.length > 0) {
    await knex('backup_schedules').whereNull('hotel_id').update({ hotel_id: hotels[0].id });
  }
}

export async function down(knex) {
  await knex.schema.dropTable('sla_configs');

  await knex.schema.createTable('sla_configs', (table) => {
    table.increments('id').primary();
    table.string('priority', 10).notNullable().unique();
    table.integer('response_time_minutes').notNullable();
    table.integer('resolution_time_minutes').notNullable();
    table.integer('escalation_time_minutes').notNullable();
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Re-seed global defaults
  await knex('sla_configs').insert([
    { priority: 'critical', response_time_minutes: 15, resolution_time_minutes: 60, escalation_time_minutes: 30 },
    { priority: 'high', response_time_minutes: 30, resolution_time_minutes: 120, escalation_time_minutes: 60 },
    { priority: 'medium', response_time_minutes: 60, resolution_time_minutes: 240, escalation_time_minutes: 120 },
    { priority: 'low', response_time_minutes: 120, resolution_time_minutes: 480, escalation_time_minutes: 240 }
  ]);
}
