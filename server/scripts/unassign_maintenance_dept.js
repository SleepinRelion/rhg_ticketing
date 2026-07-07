import db from '../config/database.js';

async function main() {
  try {
    const updatedCount = await db('tickets')
      .whereRaw('LOWER(department) = ?', ['maintenance'])
      .update({ department: null });

    console.log(`Successfully unassigned the department from ${updatedCount} maintenance tickets!`);
  } catch (err) {
    console.error('Error updating tickets:', err);
  } finally {
    process.exit(0);
  }
}

main();
