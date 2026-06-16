import bcrypt from 'bcryptjs';

export async function seed(knex) {
  // Clear existing entries in reverse dependency order
  await knex('settings').del();
  await knex('tickets').del();
  await knex('assets').del();
  await knex('rooms').del();
  await knex('categories').del();
  await knex('users').del();

  // Create Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await knex('users').insert([
    {
      username: 'admin',
      email: 'admin@hotel.com',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      role: 'admin',
      department: 'IT',
    },
    {
      username: 'manager',
      email: 'manager@hotel.com',
      password_hash: passwordHash,
      full_name: 'Operations Manager',
      role: 'manager',
      department: 'Management',
    },
    {
      username: 'tech',
      email: 'tech@hotel.com',
      password_hash: passwordHash,
      full_name: 'Maintenance Tech',
      role: 'technician',
      department: 'Maintenance',
    }
  ]);

  // Create Categories
  await knex('categories').insert([
    { id: 1, name: 'Plumbing', description: 'Leaks, clogs, water pressure' },
    { id: 2, name: 'Electrical', description: 'Lights, outlets, wiring' },
    { id: 3, name: 'HVAC', description: 'Air conditioning, heating' },
    { id: 4, name: 'Appliances', description: 'TVs, minibar, kettles' },
    { id: 5, name: 'Housekeeping', description: 'Cleaning, supplies, amenities' }
  ]);

  // Generate Crystal Rooms based on block specs
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
  let roomId = 1;

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
          id: roomId++,
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

  // Azuri Hotel Rooms
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
    const thirdDigit = parseInt(room_number.charAt(2), 10);
    const floorNumber = (thirdDigit + 1).toString();

    rooms.push({
      id: roomId++,
      room_number: room_number,
      floor: floorNumber,
      room_type: 'Standard',
      hotel_id: 3 // Radisson Blu, Azuri
    });
  });

  // Insert generated rooms in chunks
  for (let i = 0; i < rooms.length; i += 50) {
    await knex('rooms').insert(rooms.slice(i, i + 50));
  }

  // Create Assets
  await knex('assets').insert([
    { name: 'AC Unit - 1101', asset_tag: 'AC-1101', category_id: 3, room_id: 1, status: 'operational' },
    { name: 'AC Unit - 1102', asset_tag: 'AC-1102', category_id: 3, room_id: 2, status: 'operational' },
    { name: 'Lobby Chandelier', asset_tag: 'LT-LOBBY', category_id: 2, room_id: 1, status: 'operational' }
  ]);

  // Settings
  await knex('settings').insert([
    { key: 'hotel_name', value: 'Grand Plaza Hotel', type: 'string' },
    { key: 'sla_critical_hours', value: '4', type: 'number' },
    { key: 'sla_high_hours', value: '24', type: 'number' },
    { key: 'sla_medium_hours', value: '72', type: 'number' },
    { key: 'sla_low_hours', value: '168', type: 'number' }
  ]);

  console.log('Seed data inserted successfully!');
}
