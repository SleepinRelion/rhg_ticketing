import db from '../config/database.js';

async function run() {
  try {
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

    const roomsToInsert = [];
    for (const num of azuriRoomNumbers) {
      // Extract floor number (second digit in this block layout)
      const floorStr = num.charAt(1);
      roomsToInsert.push({
        hotel_id: 3, // Hotel 3 = Azuri
        room_number: num,
        floor: floorStr,
        room_type: 'standard',
        status: 'available',
        description: `Azuri Room ${num}`
      });
    }

    console.log(`Upserting ${roomsToInsert.length} rooms for Radisson Blu, Azuri...`);
    
    // Insert in chunks of 50
    for (let i = 0; i < roomsToInsert.length; i += 50) {
      await db('rooms')
        .insert(roomsToInsert.slice(i, i + 50))
        .onConflict(['hotel_id', 'room_number'])
        .merge();
    }
    
    try { 
      await db.raw("SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms))"); 
    } catch {}

    console.log('Successfully completed Azuri room setup!');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    process.exit();
  }
}

run();
