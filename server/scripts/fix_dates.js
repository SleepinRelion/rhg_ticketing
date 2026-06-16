import db from '../config/database.js';

async function run() {
  const tickets = await db('tickets').select('id', 'created_at');
  let updated = 0;

  for (const t of tickets) {
    if (typeof t.created_at === 'number') {
      const dateStr = new Date(t.created_at).toISOString();
      await db('tickets').where('id', t.id).update({
        created_at: dateStr,
        updated_at: dateStr
      });
      updated++;
    } else if (typeof t.created_at === 'string' && !isNaN(Number(t.created_at))) {
      // It might be a string like "1778443200000"
      const dateStr = new Date(Number(t.created_at)).toISOString();
      await db('tickets').where('id', t.id).update({
        created_at: dateStr,
        updated_at: dateStr
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} ticket dates.`);
  process.exit(0);
}
run();
