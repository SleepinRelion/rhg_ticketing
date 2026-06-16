import knex from 'knex';
import knexConfig from '../../knexfile.js';

const db = knex(knexConfig.development);

const roomTypesMap = {
  // Codes to Full Names
  'JKNG': 'Junior Suite Garden View',
  'PRKG': 'Premium Garden View',
  'PPOK': 'Premium Partial Ocean View',
  'PPVK': 'Premium Pool View',
  'JKNS': 'Junior Suite Ocean View',
  'PRKS': 'Premium Ocean View',
  'PRTS': 'Premium Ocean View-Twin beds',
  'FKN': 'Premium Family Room',
  'JKNX': 'Junior Suite Ocean View-Handicap',
};

const roomData = {
  // Block 1000
  '1101': 'FKN', '1102': 'PRKS', '1103': 'PRKS', '1104': 'PRKS',
  '1201': 'FKN', '1202': 'PRKS', '1203': 'PRKS', '1204': 'PRKS',
  // Block 2000
  '2101': 'FKN', '2102': 'PRKS', '2103': 'PRKG', '2104': 'PRKG', '2105': 'PRKG', '2106': 'PRKG',
  '2201': 'FKN', '2202': 'PRKG', '2203': 'PRKG', '2204': 'PRKG', '2205': 'PRKG', '2206': 'PRKG',
  '2301': 'FKN', '2302': 'PRKG', '2303': 'PRKG', '2304': 'PRKG', '2305': 'PRKG', '2306': 'PRKG',
  // Block 3000
  '3101': 'JKNX', '3102': 'PRKG', '3103': 'PRKS', '3104': 'PRKS', '3105': 'PRTS', '3106': 'JKNS',
  '3201': 'JKNS', '3202': 'PRKG', '3203': 'PRKG', '3204': 'PRTS', '3205': 'PRKS', '3206': 'JKNS',
  '3301': 'PRKG', '3302': 'PRKG', '3303': 'PRKS', '3304': 'JKNS',
  // Block 4000
  '4101': 'JKNS', '4102': 'PRKS', '4103': 'PRKS', '4104': 'PRKS', '4105': 'PRKS', '4106': 'PRKS', '4107': 'JKNX',
  '4201': 'JKNS', '4202': 'PRKS', '4203': 'PRKS', '4204': 'PRKS', '4205': 'PRKS', '4206': 'PRKS', '4207': 'JKNS',
  '4301': 'JKNS', '4302': 'PRKS', '4303': 'PRKS', '4304': 'PRKS',
  // Block 5000
  '5101': 'JKNG', '5102': 'PPOK', '5103': 'PPOK', '5104': 'PPOK', '5105': 'PPOK', '5106': 'PPOK', '5107': 'PPVK', '5108': 'PPVK', '5109': 'PPVK', '5110': 'JKNG',
  '5201': 'JKNG', '5202': 'PPOK', '5203': 'PPOK', '5204': 'PPOK', '5205': 'PPOK', '5206': 'PPOK', '5207': 'PPVK', '5208': 'PPVK', '5209': 'PPVK', '5210': 'JKNG',
  '5301': 'JKNG', '5302': 'PPOK', '5303': 'PPOK', '5304': 'PPOK', '5305': 'PPOK', '5306': 'PPVK', '5307': 'PPVK', '5308': 'PPVK',
  // Block 6000
  '6101': 'PRKG', '6102': 'PRKG', '6103': 'PRKG', '6104': 'PRKG', '6105': 'PPVK', '6106': 'PPVK', '6107': 'FKN',
  '6201': 'PRKG', '6202': 'PRKG', '6203': 'PRKG', '6204': 'PPVK', '6205': 'PPVK', '6206': 'PPVK', '6207': 'FKN',
  '6301': 'PRKG', '6302': 'PRKG', '6303': 'PRKG', '6304': 'PPVK', '6305': 'PPVK', '6306': 'PPVK', '6307': 'FKN',
  // Block 7000
  '7101': 'PPVK', '7102': 'PPVK', '7103': 'PPVK', '7104': 'PPVK', '7105': 'PPVK', '7106': 'PPVK', '7107': 'FKN',
  '7201': 'PPVK', '7202': 'PPVK', '7203': 'PPVK', '7204': 'PPVK', '7205': 'PPVK', '7206': 'PPVK', '7207': 'FKN',
  // Block 8000
  '8101': 'JKNG', '8102': 'PPOK', '8103': 'PPOK', '8104': 'PPOK', '8105': 'PPOK', '8106': 'JKNG',
  '8201': 'JKNG', '8202': 'PPOK', '8203': 'PPOK', '8204': 'PPOK', '8205': 'PPOK', '8206': 'JKNG',
  '8301': 'JKNG', '8302': 'PPOK', '8303': 'PPOK', '8304': 'PPOK',
  // Block 9000
  '9101': 'JKNG', '9102': 'PPVK', '9103': 'PPVK', '9104': 'PPVK', '9105': 'PPVK', '9106': 'PPVK', '9107': 'PPVK', '9108': 'PPVK', '9109': 'PPVK', '9110': 'JKNG',
  '9201': 'JKNG', '9202': 'PPVK', '9203': 'PPVK', '9204': 'PPVK', '9205': 'PPVK', '9206': 'PPVK', '9207': 'PPVK', '9208': 'PPVK', '9209': 'PPVK', '9210': 'JKNG',
  '9301': 'PPVK', '9302': 'PPVK', '9303': 'PPVK', '9304': 'PPVK', '9305': 'PPVK', '9306': 'PPVK',
  // Block 10000
  '10101': 'JKNG', '10102': 'PPVK', '10103': 'PPVK', '10104': 'PRKG', '10105': 'PRKG', '10106': 'JKNG',
  '10201': 'JKNG', '10202': 'PPVK', '10203': 'PPVK', '10204': 'PRKG', '10205': 'PRKG', '10206': 'JKNG',
  '10301': 'PPVK', '10302': 'PPVK', '10303': 'PPVK', '10304': 'JKNG',
  // Block 11000
  '11101': 'FKN', '11102': 'PRKG', '11103': 'PRKG', '11104': 'PRKG', '11105': 'PRKG', '11106': 'PRKG', '11107': 'PRKG', '11108': 'PRKG', '11109': 'PRKG', '11110': 'PRKG', '11111': 'PRKG', '11112': 'PRKG', '11114': 'PRKG', '11115': 'PRKG', '11116': 'PRKG', '11117': 'PRKG', '11118': 'PRKG', '11119': 'FKN',
  '11201': 'FKN', '11202': 'PRKG', '11203': 'PRKG', '11204': 'PRKG', '11205': 'PRKG', '11206': 'PRKG', '11207': 'PRKG', '11208': 'PRKG', '11209': 'PRKG', '11210': 'PRKG', '11211': 'PRKG', '11212': 'PRKG', '11214': 'PRKG', '11215': 'PRKG', '11216': 'PRKG', '11217': 'PRKG', '11218': 'PRKG', '11219': 'FKN',
  '11301': 'FKN', '11302': 'PRKG', '11303': 'PRKG', '11304': 'PRKG', '11305': 'PRKG', '11306': 'PRKG', '11307': 'PRKG', '11308': 'PRKG', '11309': 'PRKG', '11310': 'PRKG', '11311': 'PRKG', '11312': 'PRKG', '11314': 'PRKG', '11315': 'PRKG', '11316': 'PRKG', '11317': 'PRKG', '11318': 'PRKG', '11319': 'FKN',
};

async function run() {
  try {
    let updatedCount = 0;
    
    // Update rooms for hotel_id 1 (Crystal Beach)
    for (const [roomNumber, typeCode] of Object.entries(roomData)) {
      const fullTypeName = roomTypesMap[typeCode];
      if (fullTypeName) {
        const result = await db('rooms')
          .where({ room_number: roomNumber, hotel_id: 1 })
          .update({ room_type: fullTypeName });
          
        if (result > 0) {
          updatedCount++;
        }
      }
    }
    
    console.log(`Successfully updated ${updatedCount} rooms with their proper room types.`);
  } catch (error) {
    console.error('Error applying room types:', error);
  } finally {
    await db.destroy();
  }
}

run();
