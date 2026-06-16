import db from '../config/database.js';

async function run() {
  const user = await db('users').where({ email: 'm.sanmukhiya21@gmail.com' }).first();
  if (user) {
    console.log('User found:', { ...user, password: '<encrypted>' });
  } else {
    console.log('User not found.');
  }
  process.exit(0);
}
run();
