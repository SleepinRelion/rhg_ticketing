// Cleanup script: Remove old bulk "ticket_updated" activity_log entries
// that store a JSON array of field names in new_value (the old format).
// These show as "Updated: Title, Description, Priority, ..." in the timeline.

import db from '../config/database.js';

async function cleanupBulkActivityLogs() {
  try {
    // Find all activity_log entries where:
    // 1. action = 'ticket_updated'
    // 2. new_value is a JSON array (starts with '[')
    const bulkEntries = await db('activity_logs')
      .where('action', 'ticket_updated')
      .andWhere(function () {
        this.where('new_value', 'like', '[%');
      });

    console.log(`Found ${bulkEntries.length} old bulk "ticket_updated" entries to clean up.`);

    if (bulkEntries.length > 0) {
      // Show a sample before deleting
      console.log('\nSample entries:');
      for (const entry of bulkEntries.slice(0, 5)) {
        console.log(`  ID: ${entry.id}, Ticket: ${entry.ticket_id}, Action: ${entry.action}, new_value: ${entry.new_value}, Created: ${entry.created_at}`);
      }

      // Delete them
      const deleted = await db('activity_logs')
        .where('action', 'ticket_updated')
        .andWhere(function () {
          this.where('new_value', 'like', '[%');
        })
        .del();

      console.log(`\n✅ Deleted ${deleted} old bulk entries.`);
    }

    // Also check for any entries with action containing 'updated' that have JSON arrays
    const otherBulk = await db('activity_logs')
      .where('action', 'like', '%updated%')
      .andWhere(function () {
        this.where('new_value', 'like', '[%');
      });

    if (otherBulk.length > 0) {
      console.log(`\nFound ${otherBulk.length} additional entries with 'updated' action and JSON array values:`);
      for (const entry of otherBulk.slice(0, 5)) {
        console.log(`  ID: ${entry.id}, Action: ${entry.action}, new_value: ${entry.new_value}`);
      }

      const deleted2 = await db('activity_logs')
        .where('action', 'like', '%updated%')
        .andWhere(function () {
          this.where('new_value', 'like', '[%');
        })
        .del();

      console.log(`✅ Deleted ${deleted2} additional bulk entries.`);
    }

    console.log('\n✅ Cleanup complete!');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await db.destroy();
  }
}

cleanupBulkActivityLogs();
