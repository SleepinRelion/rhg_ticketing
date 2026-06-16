import db from '../config/database.js';

/**
 * Check for potential duplicate tickets.
 * Compares room, asset, category, title similarity for open/in-progress tickets.
 */
export async function findDuplicates(data) {
  const activeStatuses = ['open', 'assigned', 'in_progress', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest', 'reopened'];

  let query = db('tickets')
    .select('tickets.*', 'rooms.room_number', 'assets.name as asset_name', 'categories.name as category_name')
    .leftJoin('rooms', 'tickets.room_id', 'rooms.id')
    .leftJoin('assets', 'tickets.asset_id', 'assets.id')
    .leftJoin('categories', 'tickets.category_id', 'categories.id')
    .whereIn('tickets.status', activeStatuses)
    .whereNull('tickets.deleted_at');

  const conditions = [];

  // Same room
  if (data.room_id) {
    conditions.push(db.raw('tickets.room_id = ?', [data.room_id]));
  }

  // Same asset
  if (data.asset_id) {
    conditions.push(db.raw('tickets.asset_id = ?', [data.asset_id]));
  }

  // Same category
  if (data.category_id) {
    conditions.push(db.raw('tickets.category_id = ?', [data.category_id]));
  }

  // Similar title (basic word matching)
  if (data.title) {
    const words = data.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const word of words.slice(0, 5)) {
      conditions.push(db.raw('LOWER(tickets.title) LIKE ?', [`%${word}%`]));
    }
  }

  if (conditions.length === 0) {
    return [];
  }

  // Score-based: tickets matching more conditions rank higher
  query = query.where(function () {
    for (const condition of conditions) {
      this.orWhere(condition);
    }
  });

  const results = await query.orderBy('tickets.created_at', 'desc').limit(5);

  // Calculate match score
  return results.map((ticket) => {
    let score = 0;
    if (data.room_id && ticket.room_id === data.room_id) score += 30;
    if (data.asset_id && ticket.asset_id === data.asset_id) score += 30;
    if (data.category_id && ticket.category_id === data.category_id) score += 20;
    if (data.title) {
      const words = data.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const titleLower = ticket.title.toLowerCase();
      const matchingWords = words.filter((w) => titleLower.includes(w));
      score += Math.min(20, (matchingWords.length / Math.max(words.length, 1)) * 20);
    }
    return { ...ticket, match_score: Math.round(score) };
  }).filter((t) => t.match_score >= 20);
}
