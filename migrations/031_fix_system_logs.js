export async function up(knex) {
  // Find all auto-escalated logs falsely attributed to user 1 (System) and set them to null
  await knex('activity_logs')
    .where('action', 'escalated')
    .where('new_value', 'like', '%Auto-escalated%')
    .update({ user_id: null });
}

export async function down(knex) {
  // Revert is not safely possible without losing true user-escalations, 
  // but we can assume auto-escalations might go back to user 1.
  await knex('activity_logs')
    .where('action', 'escalated')
    .where('new_value', 'like', '%Auto-escalated%')
    .update({ user_id: 1 });
}
