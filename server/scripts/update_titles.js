import db from '../config/database.js';

async function run() {
  const tickets = await db('tickets').where('title', 'Imported Intervention').whereNotNull('description');
  let count = 0;
  for (const t of tickets) {
    if (t.description && t.description.trim() !== '') {
      await db('tickets').where('id', t.id).update({ title: t.description.substring(0, 255) });
      count++;
    }
  }
  console.log('Updated tickets titles from description: ' + count);
  process.exit(0);
}

run();
