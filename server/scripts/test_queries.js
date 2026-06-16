import knex from 'knex';
import knexConfig from '../../knexfile.js';

const db = knex(knexConfig.development);

async function test() {
  try {
    const isPg = db.client.config.client === 'pg' || db.client.config.client === 'postgresql';
    console.log('isPg:', isPg);
    
    console.log('Testing topRoomTypes...');
    const topRoomTypes = await db('tickets')
        .select('rooms.room_type as room_type', db.raw('count(*) as count'))
        .join('rooms', 'tickets.room_id', 'rooms.id')
        .whereNotNull('rooms.room_type')
        .groupBy('rooms.room_type')
        .orderBy('count', 'desc');
    console.log('topRoomTypes OK', topRoomTypes.length);

    console.log('Testing monthlyTrend...');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthFormat = isPg ? "to_char(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)";
    
    const monthlyTrend = await db('tickets')
      .select(db.raw(`${monthFormat} as month`), db.raw('count(*) as count'))
      .whereNull('deleted_at')
      .where('created_at', '>=', sixMonthsAgo)
      .groupByRaw(monthFormat)
      .orderBy('month');
    console.log('monthlyTrend OK', monthlyTrend.length);

    console.log('Testing weeklyInterventions...');
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const weekFormat = isPg ? "to_char(interventions.created_at, 'IYYY-IW')" : "strftime('%Y-%W', interventions.created_at)";

    const weeklyInterventions = await db('interventions')
      .select(db.raw(`${weekFormat} as week`), db.raw('count(*) as count'))
      .join('tickets', 'interventions.ticket_id', 'tickets.id')
      .where('interventions.created_at', '>=', eightWeeksAgo)
      .groupByRaw(weekFormat)
      .orderBy('week');
    console.log('weeklyInterventions OK', weeklyInterventions.length);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.destroy();
  }
}

test();
