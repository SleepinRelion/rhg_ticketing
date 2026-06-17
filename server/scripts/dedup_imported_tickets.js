/**
 * dedup_imported_tickets.js
 *
 * One-time script to remove duplicate legacy-imported tickets from the database.
 * Keeps the OLDEST ticket in each duplicate group (lowest id).
 * Cascades: also deletes related ticket_assignees, interventions, comments,
 *           attachments, activity_logs, notifications for the removed tickets.
 *
 * Run ONCE on the server after deploying the import_fingerprint fix:
 *   node server/scripts/dedup_imported_tickets.js
 *
 * Safe to run multiple times (idempotent).
 */

import db from '../config/database.js';

async function dedup() {
  console.log('Scanning for duplicate imported tickets...\n');

  // Find groups of tickets with identical (hotel_id, date, title, created_by)
  // that came from legacy imports (no import_fingerprint yet = old duplicates).
  // We group by a normalized key and keep the one with the smallest id.
  const rows = await db.raw(`
    SELECT
      MIN(id)                                          AS keep_id,
      array_agg(id ORDER BY id)                        AS all_ids,
      hotel_id,
      DATE(created_at)                                 AS day,
      LOWER(TRIM(LEFT(title, 80)))                     AS title_key,
      created_by
    FROM tickets
    WHERE import_fingerprint IS NULL
      AND deleted_at IS NULL
    GROUP BY hotel_id, DATE(created_at), LOWER(TRIM(LEFT(title, 80))), created_by
    HAVING COUNT(*) > 1
  `);

  const groups = rows.rows;

  if (groups.length === 0) {
    console.log('No duplicate tickets found. Nothing to do.');
    await db.destroy();
    return;
  }

  console.log(`Found ${groups.length} duplicate group(s).\n`);

  let totalDeleted = 0;

  for (const g of groups) {
    const keepId    = parseInt(g.keep_id, 10);
    const deleteIds = g.all_ids.map(Number).filter(id => id !== keepId);

    console.log(`  Group: hotel=${g.hotel_id} day=${g.day} title="${g.title_key}"`);
    console.log(`    Keep: #${keepId}   Delete: [${deleteIds.join(', ')}]`);

    await db.transaction(async (trx) => {
      // Delete child rows first (FK constraints)
      await trx('ticket_assignees').whereIn('ticket_id', deleteIds).del();
      await trx('interventions').whereIn('ticket_id', deleteIds).del();
      await trx('comments').whereIn('ticket_id', deleteIds).del();
      await trx('attachments').whereIn('ticket_id', deleteIds).del();
      await trx('activity_logs').whereIn('ticket_id', deleteIds).del();
      await trx('notifications').whereIn('ticket_id', deleteIds).del();
      await trx('ticket_tags').whereIn('ticket_id', deleteIds).del();
      await trx('ticket_links')
        .whereIn('source_ticket_id', deleteIds)
        .orWhereIn('target_ticket_id', deleteIds)
        .del();

      // Delete the duplicate tickets themselves
      const deleted = await trx('tickets').whereIn('id', deleteIds).del();
      totalDeleted += deleted;
    });
  }

  console.log(`\nDone. Deleted ${totalDeleted} duplicate ticket(s) across ${groups.length} group(s).`);

  // Now backfill import_fingerprint on the surviving tickets so future
  // imports are idempotent even for tickets that existed before the migration.
  console.log('\nBackfilling import_fingerprint on surviving legacy tickets...');

  const legacyTickets = await db('tickets')
    .whereNull('import_fingerprint')
    .whereNull('deleted_at')
    .select('id', 'hotel_id', 'created_at', 'title', 'created_by');

  // We need agent usernames for the fingerprint. Build a map of user id -> username.
  const users = await db('users').select('id', 'username');
  const userMap = new Map(users.map(u => [u.id, u.username]));

  let backfilled = 0;
  for (const t of legacyTickets) {
    const dateStr     = new Date(t.created_at).toISOString().substring(0, 10);
    const agentUsername = userMap.get(t.created_by) || '';
    const raw         = `${t.hotel_id}|${dateStr}|${(t.title || '').substring(0, 80).toLowerCase().trim()}|${agentUsername}`;

    // Use Node's built-in crypto — same hash as importService.js
    const { createHash } = await import('crypto');
    const fp = createHash('sha256').update(raw).digest('hex');

    try {
      await db('tickets').where('id', t.id).update({ import_fingerprint: fp });
      backfilled++;
    } catch {
      // If another ticket already has this fingerprint, leave this one's NULL.
      // It means it's a leftover duplicate that can be safely ignored.
    }
  }

  console.log(`Backfilled fingerprints on ${backfilled} ticket(s).`);
  console.log('\nAll done.');
  await db.destroy();
}

dedup().catch((err) => {
  console.error('Error during dedup:', err);
  process.exit(1);
});
