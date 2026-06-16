import db from '../config/database.js';

async function run() {
  try {
    // Move all the rooms we accidentally put in Hotel 3 back to Hotel 1 (Crystal Beach)
    const result = await db('rooms').where({ hotel_id: 3 }).update({ hotel_id: 1 });
    console.log(`Successfully moved ${result} rooms back to Crystal Beach!`);
  } catch (err) {
    console.error('Revert failed:', err);
  } finally {
    process.exit();
  }
}

run();
