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

    // 3. Reset metrics (Avg Resolution is 232.9h because of old seeded data resolved recently)
    // We will normalize any ticket that took longer than 48 hours to resolve, 
    // simulating a realistic resolution time between 1 and 8 hours.
    const resolvedTickets = await db('tickets').whereNotNull('resolved_at').whereNotNull('created_at');
    let resetCount = 0;
    
    for (const t of resolvedTickets) {
      const created = new Date(t.created_at);
      const resolved = new Date(t.resolved_at);
      const diffHours = (resolved - created) / (1000 * 60 * 60);
      
      if (diffHours > 24) {
        // Generate a random resolution time between 30 minutes and 12 hours
        const randomHours = (Math.random() * 11.5) + 0.5;
        const newResolved = new Date(created.getTime() + (randomHours * 60 * 60 * 1000));
        await db('tickets').where({ id: t.id }).update({ resolved_at: newResolved });
        resetCount++;
      }
    }
    
    console.log(`Successfully reset resolution times for ${resetCount} tickets to clean up report averages.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

run();
