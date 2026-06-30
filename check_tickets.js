import db from './server/config/database.js';

async function run() {
  const tickets = await db('tickets').select('id', 'ticket_number', 'hotel_id', 'created_by', 'title');
  console.log('Tickets:', tickets);
  const users = await db('users').select('id', 'username', 'role');
  console.log('Users:', users);
  process.exit(0);
}
run();
