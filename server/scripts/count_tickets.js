import db from '../config/database.js';

async function run() {
  const count = await db('tickets').count('* as total');
  const countsByHotel = await db('tickets').select('hotel_id').count('* as total').groupBy('hotel_id');
  console.log('Total tickets:', count[0].total);
  console.log('By hotel:', countsByHotel);
  process.exit(0);
}
run();
