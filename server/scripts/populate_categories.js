/**
 * Populate the live database with the new category hierarchy.
 * Safe to run multiple times — checks if categories already exist.
 * 
 * Usage: node --experimental-modules server/scripts/populate_categories.js
 */
import db from '../config/database.js';

const CATEGORIES = [
  // Tasks
  { id: 1, name: 'Daily Task', description: 'Routine daily IT tasks', ticket_type: 'task', parent_id: null },
  { id: 2, name: 'Server check (uptime,storage...)', description: 'Uptime, storage, performance monitoring', ticket_type: 'task', parent_id: null },
  { id: 3, name: 'Network Scan', description: 'Network security and vulnerability scans', ticket_type: 'task', parent_id: null },
  { id: 4, name: 'Backup', description: 'Data backup procedures', ticket_type: 'task', parent_id: null },
  { id: 5, name: 'Restoration Test', description: 'Backup restoration testing', ticket_type: 'task', parent_id: null },
  { id: 6, name: 'Asset aquisition (Quote/PR/PO)', description: 'Quote/PR/PO for new assets', ticket_type: 'task', parent_id: null },
  // Requests — Parents
  { id: 10, name: 'Account', description: 'User account management requests', ticket_type: 'request', parent_id: null },
  { id: 11, name: 'Asset', description: 'Hardware/device requests', ticket_type: 'request', parent_id: null },
  // Requests — Subcategories
  { id: 12, name: 'User Creation', description: 'New user account setup', ticket_type: 'request', parent_id: 10 },
  { id: 13, name: 'User Right Update', description: 'Permission/access changes', ticket_type: 'request', parent_id: 10 },
  { id: 14, name: 'User Termination', description: 'Account deactivation/removal', ticket_type: 'request', parent_id: 10 },
  { id: 15, name: 'Laptop request', description: 'Request for a laptop', ticket_type: 'request', parent_id: 11 },
  { id: 16, name: 'PC request', description: 'Request for a desktop PC', ticket_type: 'request', parent_id: 11 },
  { id: 17, name: 'Phone request', description: 'Request for a phone device', ticket_type: 'request', parent_id: 11 },
  { id: 18, name: 'Monitor request', description: 'Request for a monitor', ticket_type: 'request', parent_id: 11 },
  { id: 19, name: 'Other tech devices...', description: 'Other hardware requests', ticket_type: 'request', parent_id: 11 },
  // Issues — Parents
  { id: 20, name: 'Room', description: 'Room-level IT issues', ticket_type: 'issue', parent_id: null },
  { id: 21, name: 'Office/Dept', description: 'Office and department issues', ticket_type: 'issue', parent_id: null },
  { id: 22, name: 'Infra', description: 'Infrastructure-level issues', ticket_type: 'issue', parent_id: null },
  // Issues — Subcategories
  { id: 23, name: 'TV room intervention', description: 'In-room TV issues', ticket_type: 'issue', parent_id: 20 },
  { id: 24, name: 'Phone intervention', description: 'In-room phone issues', ticket_type: 'issue', parent_id: 20 },
  { id: 25, name: 'Network/cabling intervention', description: 'Room network/cabling issues', ticket_type: 'issue', parent_id: 20 },
  { id: 26, name: 'PC/Laptop/Printer intervention', description: 'Office device issues', ticket_type: 'issue', parent_id: 21 },
  { id: 27, name: 'IPTV issue (backend/channels)', description: 'Backend/channels IPTV problems', ticket_type: 'issue', parent_id: 22 },
  { id: 28, name: 'PABX issue', description: 'PBX/telephony system issues', ticket_type: 'issue', parent_id: 22 },
  { id: 29, name: 'Network/Switch issue (room block)', description: 'Room block network/switch failure', ticket_type: 'issue', parent_id: 22 },
  { id: 30, name: 'Server issue', description: 'Server hardware or software failures', ticket_type: 'issue', parent_id: 22 },
];

async function main() {
  try {
    console.log('Starting category population...');

    // Deactivate old categories that don't belong to new structure
    const existingIds = CATEGORIES.map(c => c.id);
    await db('categories')
      .whereNotIn('id', existingIds)
      .update({ is_active: false });
    console.log('Deactivated old categories not in new structure.');

    for (const cat of CATEGORIES) {
      const existing = await db('categories').where({ id: cat.id }).first();
      if (existing) {
        await db('categories').where({ id: cat.id }).update({
          name: cat.name,
          description: cat.description,
          ticket_type: cat.ticket_type,
          parent_id: cat.parent_id,
          is_active: true,
        });
        console.log(`  Updated: ${cat.name} (id=${cat.id})`);
      } else {
        await db('categories').insert({ ...cat, is_active: true, created_at: new Date() });
        console.log(`  Inserted: ${cat.name} (id=${cat.id})`);
      }
    }

    // Reset sequence
    try {
      await db.raw("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))");
    } catch {}

    // Backfill tickets without ticket_type
    const updated = await db('tickets').whereNull('ticket_type').update({ ticket_type: 'issue' });
    console.log(`Backfilled ${updated} tickets with ticket_type = 'issue'`);

    console.log('Done! Category population complete.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

main();
