import db from '../config/database.js';

async function run() {
  try {
    console.log('Adding indexes to tickets table...');
    
    const hasStatusIndex = await db.schema.hasColumn('tickets', 'status');
    if (hasStatusIndex) {
      await db.schema.alterTable('tickets', table => {
        table.index('status');
      }).catch(err => {
        if (!err.message.includes('already exists')) {
          console.log('Status index note:', err.message);
        }
      });
      console.log('Added index on status.');
    }
    
    await db.schema.alterTable('tickets', table => {
      table.index('priority');
    }).catch(err => { if (!err.message.includes('already exists')) console.log(err.message) });
    console.log('Added index on priority.');

    await db.schema.alterTable('tickets', table => {
      table.index('created_at');
    }).catch(err => { if (!err.message.includes('already exists')) console.log(err.message) });
    console.log('Added index on created_at.');

    await db.schema.alterTable('tickets', table => {
      table.index('ticket_type');
    }).catch(err => { if (!err.message.includes('already exists')) console.log(err.message) });
    console.log('Added index on ticket_type.');

    await db.schema.alterTable('tickets', table => {
      table.index('hotel_id');
    }).catch(err => { if (!err.message.includes('already exists')) console.log(err.message) });
    console.log('Added index on hotel_id.');

    console.log('Indexes added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to add indexes:', error);
    process.exit(1);
  }
}

run();
