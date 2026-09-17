import db from './server/config/database.js';
import fs from 'fs';

async function fix() {
  console.log('Restoring knex_migrations table...');
  const files = fs.readdirSync('./migrations').filter(f => f.endsWith('.js')).sort();
  
  // Create tables if completely missing
  await db.schema.createTableIfNotExists('knex_migrations', table => {
      table.increments('id');
      table.string('name');
      table.integer('batch');
      table.datetime('migration_time');
  });
  await db.schema.createTableIfNotExists('knex_migrations_lock', table => {
      table.increments('index');
      table.integer('is_locked');
  });

  // Unlock just in case
  await db('knex_migrations_lock').update({ is_locked: 0 });

  // Check how far along the DB actually is
  const hasForcePasswordChange = await db.schema.hasColumn('users', 'force_password_change');
  
  let toInsert = files;
  if (!hasForcePasswordChange) {
      const idx = files.indexOf('20260907172200_add_password_and_ldap_fields_to_users.js');
      if (idx !== -1) {
          toInsert = files.slice(0, idx);
      }
  }

  // Wipe the corrupted migration records
  await db('knex_migrations').del();

  // Insert the correct records
  const inserts = toInsert.map(f => ({ name: f, batch: 1, migration_time: new Date() }));
  if (inserts.length > 0) {
      await db('knex_migrations').insert(inserts);
  }
  
  console.log(`Successfully marked ${toInsert.length} migrations as completed!`);
  console.log('Now you can safely run: npm run migrate');
  process.exit(0);
}

fix();
