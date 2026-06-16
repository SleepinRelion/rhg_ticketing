import db from '../config/database.js';

async function run() {
  const categories = await db('categories').select('*');
  console.log(categories);
  process.exit(0);
}
run();
