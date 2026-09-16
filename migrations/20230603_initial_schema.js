export async function up(knex) {
  await knex.schema
    // Users
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.string('role').notNullable().defaultTo('staff'); // admin, manager, technician, staff
      table.string('mfa_secret');
      table.boolean('mfa_enabled').defaultTo(false);
      table.text('recovery_codes'); // json array of codes
      table.string('department');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

    // Categories
    .createTable('categories', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('description');
      table.integer('parent_id').references('id').inTable('categories').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // Rooms
    .createTable('rooms', table => {
      table.increments('id').primary();
      table.string('room_number').notNullable();
      table.string('floor');
      table.string('room_type');
      table.string('status').defaultTo('available'); // available, occupied, maintenance
      table.integer('hotel_id').references('id').inTable('hotels').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['hotel_id', 'room_number']);
    })

    // Assets
    .createTable('assets', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('asset_tag').unique();
      table.string('serial_number');
      table.string('status').defaultTo('operational');
      table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.integer('room_id').references('id').inTable('rooms').onDelete('SET NULL');
      table.string('location'); // if not in a room
      table.timestamp('next_maintenance_date');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

    // Tickets
    .createTable('tickets', table => {
      table.increments('id').primary();
      table.string('ticket_number').notNullable().unique();
      table.string('title').notNullable();
      table.text('description');
      table.string('status').notNullable().defaultTo('open'); // open, assigned, in_progress, waiting_for_parts, waiting_for_vendor, waiting_for_guest, resolved, closed, reopened, cancelled
      table.string('priority').notNullable().defaultTo('medium'); // low, medium, high, critical
      table.string('department').defaultTo('maintenance');
      table.integer('creator_id').references('id').inTable('users').onDelete('SET NULL');
      table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.integer('room_id').references('id').inTable('rooms').onDelete('SET NULL');
      table.integer('asset_id').references('id').inTable('assets').onDelete('SET NULL');
      
      table.string('guest_impact').defaultTo('none');
      table.string('guest_room_occupied').defaultTo('unknown');
      table.string('guest_name');
      
      // SLA Tracking
      table.timestamp('first_response_due_at');
      table.timestamp('first_responded_at');
      table.timestamp('resolution_due_at');
      table.timestamp('resolved_at');
      table.string('sla_status').defaultTo('on_track'); // on_track, at_risk, breached
      table.integer('escalation_level').defaultTo(0);

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at'); // soft delete
    })

    // Ticket Assignments
    .createTable('ticket_assignees', table => {
      table.integer('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.primary(['ticket_id', 'user_id']);
    })

    // Comments
    .createTable('comments', table => {
      table.increments('id').primary();
      table.integer('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.text('content').notNullable();
      table.boolean('is_internal').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

    // Attachments
    .createTable('attachments', table => {
      table.increments('id').primary();
      table.integer('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
      table.integer('comment_id').references('id').inTable('comments').onDelete('CASCADE');
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('filename').notNullable();
      table.string('original_name').notNullable();
      table.string('mime_type');
      table.integer('size');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // Knowledge Base
    .createTable('knowledge_base_articles', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('symptoms');
      table.text('resolution_steps').notNullable();
      table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.integer('author_id').references('id').inTable('users').onDelete('SET NULL');
      table.integer('view_count').defaultTo(0);
      table.integer('helpful_count').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

    // Preventive Maintenance (Interventions)
    .createTable('preventive_maintenance', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.string('frequency').notNullable(); // daily, weekly, monthly, yearly
      table.integer('asset_id').references('id').inTable('assets').onDelete('CASCADE');
      table.integer('assigned_to').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('last_performed_at');
      table.timestamp('next_due_at').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

    // Checklists
    .createTable('checklist_templates', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('checklist_items', table => {
      table.increments('id').primary();
      table.integer('template_id').references('id').inTable('checklist_templates').onDelete('CASCADE');
      table.string('content').notNullable();
      table.integer('order_index').defaultTo(0);
    })
    .createTable('ticket_checklists', table => {
      table.increments('id').primary();
      table.integer('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
      table.string('content').notNullable();
      table.boolean('is_completed').defaultTo(false);
      table.integer('completed_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('completed_at');
      table.integer('order_index').defaultTo(0);
    })

    // Notifications
    .createTable('notifications', table => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
      table.string('type').notNullable();
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // Audit Logs
    .createTable('audit_logs', table => {
      table.increments('id').primary();
      table.string('entity_type').notNullable(); // ticket, user, asset
      table.integer('entity_id').notNullable();
      table.string('action').notNullable(); // create, update, delete, change_status
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('field_name');
      table.text('old_value');
      table.text('new_value');
      table.string('ip_address');
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // Saved Views
    .createTable('saved_views', table => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('filters').notNullable(); // json string of filters
      table.boolean('is_default').defaultTo(false);
      table.boolean('is_public').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // Settings
    .createTable('settings', table => {
      table.string('key').primary();
      table.text('value').notNullable();
      table.string('type').defaultTo('string');
      table.string('description');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex) {
  await knex.schema
    .dropTableIfExists('settings')
    .dropTableIfExists('saved_views')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('notifications')
    .dropTableIfExists('ticket_checklists')
    .dropTableIfExists('checklist_items')
    .dropTableIfExists('checklist_templates')
    .dropTableIfExists('preventive_maintenance')
    .dropTableIfExists('knowledge_base_articles')
    .dropTableIfExists('attachments')
    .dropTableIfExists('comments')
    .dropTableIfExists('ticket_assignees')
    .dropTableIfExists('tickets')
    .dropTableIfExists('assets')
    .dropTableIfExists('rooms')
    .dropTableIfExists('categories')
    .dropTableIfExists('users');
}
