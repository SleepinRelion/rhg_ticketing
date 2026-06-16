import db from '../config/database.js';
import bcrypt from 'bcryptjs';

async function run() {
  const hash = await bcrypt.hash('admin123', 10);
  await db('users')
    .where({ email: 'm.sanmukhiya21@gmail.com' })
    .update({ password_hash: hash });
  console.log('Password reset successfully.');
  process.exit(0);
}
run();
