export function up(knex) {
  return knex.schema.createTable('tickets', (table) => {
    table.increments('id').primary();
    table.string('ticket_number', 30).notNullable().unique();
    table.string('title', 300).notNullable();
    table.text('description').nullable();
    table.string('status', 30).notNullable().defaultTo('open')
      .checkIn(['open', 'assigned', 'in_progress', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest', 'resolved', 'closed', 'reopened', 'cancelled']);
    table.string('priority', 10).notNullable().defaultTo('medium')
      .checkIn(['critical', 'high', 'medium', 'low']);
    table.integer('category_id').unsigned().nullable().references('id').inTable('categories').onDelete('SET NULL');
    table.integer('room_id').unsigned().nullable().references('id').inTable('rooms').onDelete('SET NULL');
    table.integer('asset_id').unsigned().nullable().references('id').inTable('assets').onDelete('SET NULL');
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
    table.string('guest_impact', 10).notNullable().defaultTo('none').checkIn(['none', 'low', 'medium', 'high']);
    table.string('guest_room_occupied', 10).notNullable().defaultTo('unknown').checkIn(['yes', 'no', 'unknown']);
    table.string('guest_name', 200).nullable();
    table.string('booking_reference', 100).nullable();
    table.string('department', 30).nullable()
      .checkIn(['front_desk', 'housekeeping', 'maintenance', 'kitchen', 'finance', 'restaurant', 'management', 'IT']);
    table.string('out_of_order_room', 5).notNullable().defaultTo('no').checkIn(['yes', 'no']);
    table.string('requires_vendor', 5).notNullable().defaultTo('no').checkIn(['yes', 'no']);
    table.string('vendor_name', 200).nullable();
    table.decimal('cost_estimate', 12, 2).nullable();
    table.decimal('actual_cost', 12, 2).nullable();
    table.text('cancellation_reason').nullable();
    table.datetime('first_response_due_at').nullable();
    table.datetime('resolution_due_at').nullable();
    table.datetime('first_responded_at').nullable();
    table.datetime('resolved_at').nullable();
    table.string('sla_status', 15).notNullable().defaultTo('on_track').checkIn(['on_track', 'at_risk', 'breached']);
    table.integer('escalation_level').notNullable().defaultTo(0);
    table.integer('parent_ticket_id').unsigned().nullable().references('id').inTable('tickets').onDelete('SET NULL');
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('deleted_at').nullable();

    table.index(['status']);
    table.index(['priority']);
    table.index(['sla_status']);
    table.index(['created_by']);
    table.index(['room_id']);
    table.index(['asset_id']);
    table.index(['department']);
    table.index(['deleted_at']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('tickets');
}
