import db from '../config/database.js';

async function run() {
  const hotels = await db('hotels').select('*');
  console.log('Hotels:', JSON.stringify(hotels, null, 2));
  process.exit(0);
}
run();
