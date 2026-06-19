import db from '../config/database.js';

async function run() {
  try {
    const existing = await db('categories').where({ name: 'Training' }).first();
    if (!existing) {
      await db('categories').insert({
        name: 'Training',
        description: 'Training and Onboarding requests',
        is_active: true
      });
      console.log('Training category added.');
    } else {
      console.log('Training category already exists.');
    }
  } catch (err) {
    console.error('Error adding training category:', err);
  } finally {
    process.exit();
  }
}

run();
