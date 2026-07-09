import db from '../config/db.js';

async function resetWorkMinutes() {
  try {
    console.log('Resetting work minutes (setting duration_minutes to 0 in interventions)...');
    
    const count = await db('interventions').update({ duration_minutes: 0 });
    
    console.log(`Successfully reset work minutes for ${count} interventions.`);
  } catch (error) {
    console.error('Error resetting work minutes:', error);
  } finally {
    process.exit(0);
  }
}

resetWorkMinutes();
