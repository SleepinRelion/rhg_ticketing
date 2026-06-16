import db from '../config/database.js';

async function run() {
  try {
    console.log('Fixing Azuri floors...');
    
    // Fetch all Azuri rooms
    const azuriRooms = await db('rooms').where({ hotel_id: 3 });
    
    for (const room of azuriRooms) {
      if (room.room_number.length >= 3) {
        const thirdDigit = parseInt(room.room_number.charAt(2), 10);
        if (!isNaN(thirdDigit)) {
          const floorNumber = (thirdDigit + 1).toString();
          
          if (room.floor !== floorNumber) {
            await db('rooms')
              .where({ id: room.id })
              .update({ floor: floorNumber });
          }
        }
      }
    }

    console.log('Floors fixed successfully!');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    process.exit();
  }
}

run();
