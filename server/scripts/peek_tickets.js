import db from '../config/database.js';

async function run() {
  const tickets = await db('tickets').select('id', 'ticket_number', 'title', 'created_at', 'hotel_id').orderBy('id', 'desc').limit(5);
  console.log(tickets);
  process.exit(0);
}
run();
