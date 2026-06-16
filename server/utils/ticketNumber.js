import db from '../config/database.js';

/**
 * Generate the next ticket number in format TKT-YYYY-NNNN
 */
export async function generateTicketNumber(trx = db) {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  const lastTicket = await trx('tickets')
    .where('ticket_number', 'like', `${prefix}%`)
    .orderBy('ticket_number', 'desc')
    .first();

  let nextNum = 1;
  if (lastTicket) {
    const lastNum = parseInt(lastTicket.ticket_number.replace(prefix, ''), 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}
