import db from './server/config/database.js';

async function run() {
  try {
    const exists = await db.schema.hasTable('departments');
    if (!exists) {
      await db.schema.createTable('departments', table => {
        table.increments('id').primary();
        table.string('name', 50).notNullable().unique();
        table.boolean('is_active').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('Created departments table.');
      
      await db('departments').insert([
        { name: 'IT' },
        { name: 'Maintenance' },
        { name: 'Housekeeping' },
        { name: 'Front Desk' },
        { name: 'Management' }
      ]);
      console.log('Inserted default departments.');
    } else {
      console.log('Departments table already exists.');
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
