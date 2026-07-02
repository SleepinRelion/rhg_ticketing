export async function up(knex) {
  // Check if 'Account' parent category for 'request' already exists
  let accountCat = await knex('categories')
    .where({ name: 'Account', ticket_type: 'request' })
    .first();

  if (!accountCat) {
    const [insertedIds] = await knex('categories').insert({
      name: 'Account',
      description: 'Account management, access, and passwords',
      ticket_type: 'request',
      is_active: true
    }).returning('id');
    
    // Postgres returns an array of objects for returning('id'), SQLite returns an array of ids.
    const parentId = typeof insertedIds === 'object' ? insertedIds.id : insertedIds;

    await knex('categories').insert([
      { name: 'Password Change', description: 'Reset or change account password', ticket_type: 'request', parent_id: parentId, is_active: true },
      { name: 'New Account', description: 'Create a new employee account', ticket_type: 'request', parent_id: parentId, is_active: true },
      { name: 'Access Request', description: 'Request access to a specific system', ticket_type: 'request', parent_id: parentId, is_active: true }
    ]);
  } else {
    // Parent exists, check for 'Password Change'
    const pwdCat = await knex('categories')
      .where({ name: 'Password Change', parent_id: accountCat.id })
      .first();
      
    if (!pwdCat) {
      await knex('categories').insert({
        name: 'Password Change', 
        description: 'Reset or change account password', 
        ticket_type: 'request', 
        parent_id: accountCat.id, 
        is_active: true
      });
    }
  }
}

export async function down(knex) {
  // Removing these might cause constraint issues if tickets exist, so we just set them to inactive
  await knex('categories')
    .where({ name: 'Password Change' })
    .update({ is_active: false });
}
