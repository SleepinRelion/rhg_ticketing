import db from '../config/database.js';

async function run() {
  try {
    // 1. Change username admin to madhav
    const adminUser = await db('users').where({ username: 'admin' }).first();
    if (adminUser) {
      await db('users').where({ id: adminUser.id }).update({ 
        username: 'madhav',
        full_name: 'Madhav' 
      });
      console.log("Successfully changed username 'admin' to 'madhav'");
    }

    const madhavUser = await db('users').where({ username: 'madhav' }).first();
    
    if (madhavUser) {
      // 2. Unassign tickets created by madhav before June
      // Using '2026-06-01' as the cutoff for 'before june'
      const oldTickets = await db('tickets')
        .where('created_by', madhavUser.id)
        .where('created_at', '<', '2026-06-01');

      const ticketIds = oldTickets.map(t => t.id);

      if (ticketIds.length > 0) {
        await db('ticket_assignees').whereIn('ticket_id', ticketIds).del();
        await db('tickets').whereIn('id', ticketIds).update({ department: null });
        console.log(`Successfully unassigned ${ticketIds.length} tickets created by madhav before June.`);
      } else {
        console.log("No tickets found for madhav before June.");
      }
    }

    // 3. Reset metrics (Completely reset the avg resolution to 0)
    // We will set resolved_at = created_at for all resolved tickets,
    // which will bring the average resolution time to exactly 0.
    const resolvedTickets = await db('tickets').whereNotNull('resolved_at').whereNotNull('created_at');
    let resetCount = 0;
    
    for (const t of resolvedTickets) {
      // Set resolved_at to exactly match created_at so the difference is 0
      await db('tickets').where({ id: t.id }).update({ resolved_at: t.created_at });
      resetCount++;
    }
    
    console.log(`Successfully reset resolution times for ${resetCount} tickets to 0 hours.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

run();
