export async function seed(knex) {
  // Clear tables
  await knex('user_hotels').del();
  await knex('hotels').del();

  // Create 3 hotels
  const hotels = await knex('hotels').insert([
    { id: 1, name: 'Crystals Beach Resort Belle Mare, a member of Radisson Individuals', address: 'Mauritius', contact_email: 'info@crystalbeach.com' },
    { id: 2, name: 'Radisson Blu, Poste Lafayette', address: 'Poste Lafayette, Mauritius', contact_email: 'info@radissonblupl.com' },
    { id: 3, name: 'Radisson Blu, Azuri', address: 'Azuri, Mauritius', contact_email: 'info@radissonbluazuri.com' },
  ]).returning('id');

  try { await knex.raw("SELECT setval('hotels_id_seq', (SELECT MAX(id) FROM hotels))"); } catch {}

  // Assign existing users to Hotel 1 by default, and some to all
  const users = await knex('users').select('id', 'role');
  const userHotels = [];
  
  for (const user of users) {
    if (user.role === 'admin' || user.role === 'manager') {
      // Admins and managers get access to all 3 hotels
      userHotels.push({ user_id: user.id, hotel_id: 1 });
      userHotels.push({ user_id: user.id, hotel_id: 2 });
      userHotels.push({ user_id: user.id, hotel_id: 3 });
    } else {
      // Techs and staff get access to Hotel 1 only for seed purposes
      userHotels.push({ user_id: user.id, hotel_id: 1 });
    }
    
    // Set primary hotel
    await knex('users').where('id', user.id).update({ primary_hotel_id: 1 });
  }
  
  if (userHotels.length > 0) {
    await knex('user_hotels').insert(userHotels);
  }

  // Update existing tickets, rooms, assets to belong to Hotel 1 if they don't have one
  await knex('tickets').whereNull('hotel_id').update({ hotel_id: 1 });
  await knex('rooms').whereNull('hotel_id').update({ hotel_id: 1 });
  await knex('assets').whereNull('hotel_id').update({ hotel_id: 1 });

  // SLA Configs per hotel
  const slaConfigs = [
    { priority: 'critical', response_time_minutes: 30, resolution_time_minutes: 240, escalation_time_minutes: 15 },
    { priority: 'high', response_time_minutes: 120, resolution_time_minutes: 1440, escalation_time_minutes: 60 },
    { priority: 'medium', response_time_minutes: 480, resolution_time_minutes: 4320, escalation_time_minutes: 480 },
    { priority: 'low', response_time_minutes: 1440, resolution_time_minutes: 10080, escalation_time_minutes: 1440 },
  ];

  const slaInserts = [];
  for (const h of [1, 2, 3]) {
    for (const c of slaConfigs) {
      slaInserts.push({ hotel_id: h, ...c });
    }
  }
  await knex('sla_configs').del();
  await knex('sla_configs').insert(slaInserts);
}
