import db from '../config/database.js';

async function main() {
  const tickets = await db('tickets')
    .select('tickets.id', 'tickets.title', 'tickets.status', 'tickets.room_id', 'rooms.room_number')
    .join('rooms', 'tickets.room_id', 'rooms.id')
    .where('rooms.room_number', '1101');
    
  console.log('TICKETS FOR ROOM 1101:', tickets);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
