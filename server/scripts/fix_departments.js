import db from '../config/database.js';

async function run() {
  try {
    const result = await db('tickets')
      .whereNotNull('import_fingerprint')
      .andWhere('department', 'maintenance')
      .update({ department: 'IT' });
      
    console.log(`Successfully updated ${result} imported tickets to IT department.`);
  } catch (error) {
    console.error('Error updating departments:', error);
  } finally {
    process.exit(0);
  }
}

run();
