export async function seed(knex) {
  // Clear existing default rooms
  await knex('rooms').whereNull('hotel_id').orWhere('hotel_id', 1).del();

  const specs = [
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

  for (const spec of specs) {
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
          room_type: 'standard',
          status: 'available',
          description: `Standard Room ${roomStr}`,
        });
        
        generated++;
        roomNum++;
      }
    }
  }

  // Insert generated rooms in chunks of 50
  for (let i = 0; i < rooms.length; i += 50) {
    await knex('rooms').insert(rooms.slice(i, i + 50));
  }

  try { await knex.raw("SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms))"); } catch {}
}
