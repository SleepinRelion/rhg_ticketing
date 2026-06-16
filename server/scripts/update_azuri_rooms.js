import db from '../config/database.js';

async function run() {
  try {
    console.log('Starting full rooms update...');
    
    // Unlink existing references to rooms
    console.log('Unlinking assets and tickets from old rooms...');
    await db('assets').update({ room_id: null });
    await db('tickets').update({ room_id: null });

    // Delete existing rooms
    console.log('Deleting old rooms...');
    await db('rooms').del();

    console.log('Altering rooms table to allow overlapping room numbers across hotels...');
    const hasConstraint = await db.schema.hasColumn('rooms', 'hotel_id');
    if (hasConstraint) {
      await db.schema.alterTable('rooms', table => {
        table.dropUnique('room_number');
        table.unique(['hotel_id', 'room_number']);
      });
    }

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

    const rooms = [];
    
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
          if (spec.skip13 && roomNum === 13) {
            roomNum++;
            continue;
          }
          
          const roomStr = `${spec.block}${floor}${roomNum.toString().padStart(2, '0')}`;
          rooms.push({
            room_number: roomStr,
            floor: floor.toString(),
            room_type: 'Standard',
            hotel_id: 1 // Crystal Beach
          });
          
          generated++;
          roomNum++;
        }
      }
    }

    const azuriRooms = [
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

    azuriRooms.forEach((room_number) => {
      rooms.push({
        room_number: room_number,
        floor: room_number.substring(0, 2),
        room_type: 'Standard',
        hotel_id: 3 // Radisson Blu, Azuri
      });
    });

    console.log(`Inserting ${rooms.length} new rooms for Crystal and Azuri...`);
    for (let i = 0; i < rooms.length; i += 50) {
      await db('rooms').insert(rooms.slice(i, i + 50));
    }

    console.log('Update complete!');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    process.exit();
  }
}

run();
