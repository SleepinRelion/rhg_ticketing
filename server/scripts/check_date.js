import db from '../config/database.js';

async function run() {
  const ticket = await db('tickets').where('id', 1).first();
  console.log(ticket.created_at);
  console.log(typeof ticket.created_at);
  process.exit(0);
}
run();
