import db from './server/config/database.js';

async function main() {
  const res = await db.raw("SELECT conname FROM pg_constraint WHERE conrelid = 'tickets'::regclass;");
  console.log(res.rows);
  process.exit(0);
}

main();
