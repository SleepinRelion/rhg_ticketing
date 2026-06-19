import db from '../config/database.js';

async function run() {
  try {
    console.log('=== Fixing rooms for ALL hotels ===\n');

    // First, ensure the unique constraint is (hotel_id, room_number) not just room_number
    try {
      await db.schema.alterTable('rooms', table => {
        table.dropUnique('room_number');
      });
      console.log('Dropped old unique(room_number) constraint');
    } catch {
      // Already dropped, that's fine
    }

    try {
      await db.schema.alterTable('rooms', table => {
        table.unique(['hotel_id', 'room_number']);
      });
      console.log('Added unique(hotel_id, room_number) constraint');
    } catch {
      // Already exists, that's fine
    }

    // =============================
    // 1. Crystal Beach (Hotel 1)
    // =============================
    const crystalSpecs = [
      { block: 1, total: 8, floors: 2, endRoomNum: 4, skip13: false },
      { block: 2, total: 18, floors: 3, endRoomNum: 6, skip13: false },
      { block: 3, total: 16, floors: 3, endRoomNum: 4, skip13: false },
      { block: 4, total: 18, floors: 3, endRoomNum: 4, skip13: false },
      { block: 5, total: 28, floors: 3, endRoomNum: 8, skip13: false },
      { block: 6, total: 21, floors: 3, endRoomNum: 7, skip13: false },
      { block: 7, total: 14, floors: 2, endRoomNum: 7, skip13: false },
      { block: 8, total: 16, floors: 3, endRoomNum: 4, skip13: false },
      { block: 9, total: 26, floors: 3, endRoomNum: 6, skip13: false },
      { block: 10, total: 16, floors: 3, endRoomNum: 4, skip13: false },
      { block: 11, total: 54, floors: 3, endRoomNum: 19, skip13: true },
    ];

    const crystalRooms = [];
    for (const spec of crystalSpecs) {
      const actualLastFloorRooms = spec.skip13 && spec.endRoomNum >= 13 ? spec.endRoomNum - 1 : spec.endRoomNum;
      const lowerFloorsCount = spec.floors - 1;
      const perLowerFloor = lowerFloorsCount > 0 ? (spec.total - actualLastFloorRooms) / lowerFloorsCount : 0;

      for (let floor = 1; floor <= spec.floors; floor++) {
        const isLastFloor = floor === spec.floors;
        const roomCountThisFloor = isLastFloor ? actualLastFloorRooms : perLowerFloor;
        let generated = 0;
        let roomNum = 1;
        while (generated < roomCountThisFloor) {
          if (spec.skip13 && roomNum === 13) { roomNum++; continue; }
          const roomStr = `${spec.block}${floor}${roomNum.toString().padStart(2, '0')}`;
          crystalRooms.push({
            room_number: roomStr,
            floor: floor.toString(),
            room_type: 'Standard',
            hotel_id: 1,
            status: 'available',
            is_active: true
          });
          generated++;
          roomNum++;
        }
      }
    }

    console.log(`Crystal Beach: ${crystalRooms.length} rooms`);
    for (let i = 0; i < crystalRooms.length; i += 50) {
      await db('rooms')
        .insert(crystalRooms.slice(i, i + 50))
        .onConflict(['hotel_id', 'room_number'])
        .merge({ is_active: true, status: db.raw('COALESCE(rooms.status, EXCLUDED.status)') });
    }

    // =============================
    // 2. Poste Lafayette (Hotel 2)
    // =============================
    const posteLafayetteRooms = [];
    const generatePLRooms = (roomType, start, end) => {
      for (let num = start; num <= end; num++) {
        const roomStr = num.toString();
        const floorStr = roomStr.charAt(1);
        posteLafayetteRooms.push({
          hotel_id: 2,
          room_number: roomStr,
          floor: floorStr,
          room_type: roomType,
          status: 'available',
          is_active: true
        });
      }
    };

    // Ocean views: 3201-3218, 3101-3106
    generatePLRooms('ocean_view', 3201, 3218);
    generatePLRooms('ocean_view', 3101, 3106);
    // Standard: 4101-4118, 4201-4211
    generatePLRooms('standard', 4101, 4118);
    generatePLRooms('standard', 4201, 4211);
    // Garden: 3001-3018, 3107-3118
    generatePLRooms('garden', 3001, 3018);
    generatePLRooms('garden', 3107, 3118);
    // Beachfront: 2101-2109
    generatePLRooms('beachfront', 2101, 2109);
    // Superior Beach access: 1001-1010, 2001-2009
    generatePLRooms('superior_beach_access', 1001, 1010);
    generatePLRooms('superior_beach_access', 2001, 2009);

    console.log(`Poste Lafayette: ${posteLafayetteRooms.length} rooms`);
    for (let i = 0; i < posteLafayetteRooms.length; i += 50) {
      await db('rooms')
        .insert(posteLafayetteRooms.slice(i, i + 50))
        .onConflict(['hotel_id', 'room_number'])
        .merge({ is_active: true, status: db.raw('COALESCE(rooms.status, EXCLUDED.status)') });
    }

    // =============================
    // 3. Azuri (Hotel 3)
    // =============================
    const azuriRoomNumbers = [
      '1101', '1102', '1103', '1104', '1105', '1112', '1113', '1114', '1115',
      '1201', '1202', '1203', '1204', '1205', '1206', '1211', '1212', '1213', '1214', '1215', '1216',
      '1301', '1302', '1303', '1304', '1305', '1306', '1307', '1311', '1312', '1313', '1314', '1315', '1316', '1317',
      '1401', '1402', '1403', '1404', '1405', '1406', '1407', '1408', '1411', '1412', '1413', '1414', '1415', '1416', '1417', '1418',
      '1501', '1502', '1503', '1504', '1505', '1511', '1512', '1513', '1514', '1515',
      '1601', '1602', '1603', '1604', '1611', '1612', '1613', '1614',
      '1701', '1702', '1703', '1704', '1705', '1706', '1711', '1712', '1713', '1714', '1715', '1716',
      '1801', '1802', '1803', '1804', '1805', '1806', '1807', '1808', '1809', '1810',
      '1901', '1902', '1903', '1904', '1905', '1906', '1907', '1908', '1909', '1910'
    ];

    const azuriRooms = azuriRoomNumbers.map(room_number => ({
      room_number,
      floor: room_number.substring(0, 2),
      room_type: 'Standard',
      hotel_id: 3,
      status: 'available',
      is_active: true
    }));

    console.log(`Azuri: ${azuriRooms.length} rooms`);
    for (let i = 0; i < azuriRooms.length; i += 50) {
      await db('rooms')
        .insert(azuriRooms.slice(i, i + 50))
        .onConflict(['hotel_id', 'room_number'])
        .merge({ is_active: true, status: db.raw('COALESCE(rooms.status, EXCLUDED.status)') });
    }

    // Also fix any existing rooms that have is_active = false or NULL
    const fixed = await db('rooms').whereNot({ is_active: true }).orWhereNull('is_active').update({ is_active: true });
    if (fixed > 0) console.log(`\nFixed ${fixed} rooms that had is_active != true`);

    // Reset Postgres sequence
    try {
      await db.raw("SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms))");
    } catch {}

    // Summary
    const counts = await db('rooms')
      .select('hotel_id')
      .count('* as count')
      .where({ is_active: true })
      .groupBy('hotel_id');
    
    console.log('\n=== Room counts per hotel ===');
    for (const c of counts) {
      const hotel = await db('hotels').where({ id: c.hotel_id }).first();
      console.log(`  ${hotel ? hotel.name : `Hotel ${c.hotel_id}`}: ${c.count} rooms`);
    }

    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

run();
