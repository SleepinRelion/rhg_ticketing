import db from '../config/database.js';

async function run() {
  try {
    console.log('Adding Poste Lafayette rooms...');
    
    // 2. Add Poste Lafayette (Hotel 2) rooms
    const posteLafayetteRooms = [];
    // Helper to generate a range of rooms for Poste Lafayette
    const generateRooms = (roomType, start, end) => {
      for (let num = start; num <= end; num++) {
        const roomStr = num.toString();
        const floorStr = roomStr.charAt(1); // e.g., 3101 -> floor 1, 4201 -> floor 2
        posteLafayetteRooms.push({
          hotel_id: 2,
          room_number: roomStr,
          floor: floorStr,
          room_type: roomType,
          status: 'available',
          description: `${roomType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${roomStr}`
        });
      }
    };

    // Ocean views room: 3201-3218 and 3101-3106
    generateRooms('ocean_view', 3201, 3218);
    generateRooms('ocean_view', 3101, 3106);

    // Standard: 4101-4118 and 4201-4211
    generateRooms('standard', 4101, 4118);
    generateRooms('standard', 4201, 4211);

    // Garden room: 3001-3018, 3107-3118
    generateRooms('garden', 3001, 3018);
    generateRooms('garden', 3107, 3118);

    // Beachfront Room: 2101-2109
    generateRooms('beachfront', 2101, 2109);

    // Superior Beach access: 1001-1010, 2001-2009
    generateRooms('superior_beach_access', 1001, 1010);
    generateRooms('superior_beach_access', 2001, 2009);

    // Insert or update Poste Lafayette rooms
    console.log(`Upserting ${posteLafayetteRooms.length} rooms for Radisson Blu, Poste Lafayette (Hotel 2)...`);
    
    // Insert in chunks of 50
    for (let i = 0; i < posteLafayetteRooms.length; i += 50) {
      await db('rooms')
        .insert(posteLafayetteRooms.slice(i, i + 50))
        .onConflict(['hotel_id', 'room_number'])
        .merge();
    }
    
    // Update the Postgres sequence
    try { 
      await db.raw("SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms))"); 
    } catch {}

    console.log('Successfully completed hotel room setup!');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    process.exit();
  }
}

run();
