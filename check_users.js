import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function checkUsers() {
  try {
    const users = await db('users').select('id', 'email', 'username', 'is_active', 'locked_until');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkUsers();
