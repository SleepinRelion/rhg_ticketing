import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Force load the ROOT .env file so we connect to the EXACT same database as production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

import knex from 'knex';
import knexConfig from './knexfile.js';

const db = knex(knexConfig.production);

async function forceFixSchema() {
  console.log('Connecting to production database...');
  try {
    // 1. Fix the users table missing columns
    const hasForcePwd = await db.schema.hasColumn('users', 'force_password_change');
    if (!hasForcePwd) {
      console.log('Adding force_password_change to users...');
      await db.schema.alterTable('users', table => {
        table.boolean('force_password_change').defaultTo(false);
      });
    }

    const hasLdap = await db.schema.hasColumn('users', 'ldap_dn');
    if (!hasLdap) {
      console.log('Adding ldap_dn to users...');
      await db.schema.alterTable('users', table => {
        table.string('ldap_dn');
      });
    }
    
    // Check if primary_hotel_id exists
    const hasPrimaryHotel = await db.schema.hasColumn('users', 'primary_hotel_id');
    if (!hasPrimaryHotel) {
      console.log('Adding primary_hotel_id to users...');
      await db.schema.alterTable('users', table => {
        table.integer('primary_hotel_id').unsigned().nullable().references('id').inTable('hotels').onDelete('SET NULL');
      });
    }

    // 2. Fix the preventive_maintenance migration crash
    // Since the column already exists but the migration table doesn't know it, we just insert it into knex_migrations
    console.log('Marking 20260914161500_add_hotel_id_to_pm.js as completed...');
    const pmMigration = await db('knex_migrations').where('name', '20260914161500_add_hotel_id_to_pm.js').first();
    if (!pmMigration) {
      await db('knex_migrations').insert({
        name: '20260914161500_add_hotel_id_to_pm.js',
        batch: 1,
        migration_time: new Date()
      });
    }

    // 3. Ensure the renamed migration is tracked so it doesn't cause 'missing file' errors
    console.log('Marking 20260914170000_add_system_and_outlets_categories.js as completed...');
    const outMigration = await db('knex_migrations').where('name', '20260914170000_add_system_and_outlets_categories.js').first();
    if (!outMigration) {
      await db('knex_migrations').insert({
        name: '20260914170000_add_system_and_outlets_categories.js',
        batch: 1,
        migration_time: new Date()
      });
    }
    
    // Delete the old missing name from migrations just in case it's still there
    await db('knex_migrations').where('name', '033_add_system_and_outlets_categories.js').del();

    console.log('✅ Production database schema successfully forced to the correct state!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing schema:', err);
    process.exit(1);
  }
}

forceFixSchema();
