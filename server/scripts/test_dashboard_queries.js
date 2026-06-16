import knex from 'knex';
import knexConfig from '../../knexfile.js';
import { buildTicketVisibilityQuery } from '../services/ticketService.js';

const db = knex(knexConfig.development);

async function test() {
  try {
    const req = { user: { role: 'admin' } };
    const date_from = null;
    const date_to = null;

    let baseFilter = (q) => {
      q = q.whereNull('tickets.deleted_at');
      if (date_from) q = q.where('tickets.created_at', '>=', date_from);
      if (date_to) q = q.where('tickets.created_at', '<=', date_to);
      return buildTicketVisibilityQuery(q, req.user);
    };

    console.log('Testing byStatus');
    await baseFilter(db('tickets').select('status').count('* as count').groupBy('status'));

    console.log('Testing byPriority');
    await baseFilter(db('tickets').select('priority').count('* as count').groupBy('priority'));

    console.log('Testing byDepartment');
    await baseFilter(db('tickets').select('department').count('* as count').whereNotNull('department').groupBy('department'));

    console.log('Testing byCategory');
    await baseFilter(
      db('tickets')
        .select('categories.name as category', db.raw('count(*) as count'))
        .leftJoin('categories', 'tickets.category_id', 'categories.id')
        .whereNotNull('tickets.category_id')
        .groupBy('categories.name')
    ).orderBy('count', 'desc');

    console.log('Testing topRooms');
    await baseFilter(
      db('tickets')
        .select('rooms.room_number', db.raw('count(*) as count'))
        .join('rooms', 'tickets.room_id', 'rooms.id')
        .groupBy('rooms.room_number')
    ).orderBy('count', 'desc');

    console.log('Testing topAssets');
    await baseFilter(
      db('tickets')
        .select('assets.name as asset_name', db.raw('count(*) as count'))
        .join('assets', 'tickets.asset_id', 'assets.id')
        .groupBy('assets.name')
    ).orderBy('count', 'desc');

    console.log('Testing topRoomTypes');
    await baseFilter(
      db('tickets')
        .select('rooms.room_type as room_type', db.raw('count(*) as count'))
        .join('rooms', 'tickets.room_id', 'rooms.id')
        .whereNotNull('rooms.room_type')
        .groupBy('rooms.room_type')
    ).orderBy('count', 'desc');

    console.log('Testing techWorkload');
    let techWorkloadQuery = db('ticket_assignees')
      .select('users.full_name', db.raw('count(*) as count'))
      .join('users', 'ticket_assignees.user_id', 'users.id')
      .join('tickets', 'ticket_assignees.ticket_id', 'tickets.id')
      .whereNotIn('tickets.status', ['closed', 'cancelled'])
      .whereNull('tickets.deleted_at');
    techWorkloadQuery = buildTicketVisibilityQuery(techWorkloadQuery, req.user);
    await techWorkloadQuery.groupBy('users.full_name').orderBy('count', 'desc');

    console.log('Testing monthlyTrend');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const isPg = db.client.config.client === 'pg' || db.client.config.client === 'postgresql';
    const monthFormat = isPg ? "to_char(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)";
    
    await db('tickets')
      .select(db.raw(`${monthFormat} as month`), db.raw('count(*) as count'))
      .whereNull('deleted_at')
      .where('created_at', '>=', sixMonthsAgo)
      .groupByRaw(monthFormat)
      .orderBy('month');

    console.log('Testing slaCompliance');
    await baseFilter(
      db('tickets')
        .select('sla_status', db.raw('count(*) as count'))
        .whereNotIn('status', ['cancelled'])
        .groupBy('sla_status')
    );

    console.log('Testing weeklyInterventions');
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const weekFormat = isPg ? "to_char(interventions.created_at, 'IYYY-IW')" : "strftime('%Y-%W', interventions.created_at)";

    let weeklyInterventionsQuery = db('interventions')
      .select(db.raw(`${weekFormat} as week`), db.raw('count(*) as count'))
      .join('tickets', 'interventions.ticket_id', 'tickets.id')
      .where('interventions.created_at', '>=', eightWeeksAgo);
      
    weeklyInterventionsQuery = buildTicketVisibilityQuery(weeklyInterventionsQuery, req.user);
    await weeklyInterventionsQuery.groupByRaw(weekFormat).orderBy('week');

    console.log('ALL QUERIES OK');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.destroy();
  }
}

test();
