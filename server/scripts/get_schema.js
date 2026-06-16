import db from '../config/database.js';

async function run() {
  const roomsCount = await db('rooms').select('hotel_id').count('id as count').groupBy('hotel_id');
  console.log(JSON.stringify(roomsCount, null, 2));
  process.exit(0);
}
run();
