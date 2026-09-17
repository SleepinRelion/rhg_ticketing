import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';
const router = Router();

// GET /api/calendar/token (Authenticated)
router.get('/token', authenticate, asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'];
  if (!hotelId) return res.status(400).json({
    error: 'Hotel context is required.'
  });
  
  const targetHotelId = hotelId === 'all' ? null : hotelId;
  
  let query = db('settings').where({ key: 'CALENDAR_FEED_TOKEN' });
  if (targetHotelId === null) {
    query = query.whereNull('hotel_id');
  } else {
    query = query.where('hotel_id', targetHotelId);
  }
  
  let setting = await query.first();
  let token;
  if (!setting) {
    token = crypto.randomUUID();
    await db('settings').insert({
      hotel_id: targetHotelId,
      key: 'CALENDAR_FEED_TOKEN',
      value: token
    });
  } else {
    token = setting.value;
  }

  // Use the host header directly to ensure the URL matches what the client is using (e.g. local IP vs domain)
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const feedUrl = `${protocol}://${host}/api/calendar/feed/${hotelId}/${token}.ics`;
  res.json({
    token,
    feedUrl
  });
}));

// GET /api/calendar/feed/:hotelId/:token.ics (Public)
router.get('/feed/:hotelId/:token.ics', asyncHandler(async (req, res) => {
  const {
    hotelId,
    token
  } = req.params;
  const targetHotelId = hotelId === 'all' ? null : hotelId;
  
  let query = db('settings').where({ key: 'CALENDAR_FEED_TOKEN', value: token });
  if (targetHotelId === null) {
    query = query.whereNull('hotel_id');
  } else {
    query = query.where('hotel_id', targetHotelId);
  }
  const setting = await query.first();
  if (!setting) {
    return res.status(403).send('Invalid or expired calendar feed token.');
  }

  let ticketsQuery = db('tickets').whereNotNull('resolution_due_at').whereIn('status', ['open', 'in_progress', 'assigned', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest']);
  if (hotelId !== 'all') {
    ticketsQuery = ticketsQuery.where('hotel_id', hotelId);
  }
  const tickets = await ticketsQuery;

  let pmQuery = db('preventive_maintenance').select('preventive_maintenance.*', 'assets.name as asset_name').leftJoin('assets', 'preventive_maintenance.asset_id', 'assets.id').where('preventive_maintenance.is_active', true).whereNotNull('preventive_maintenance.next_due_date');
  if (hotelId !== 'all') {
    pmQuery = pmQuery.where('preventive_maintenance.hotel_id', hotelId);
  }
  const pmTasks = await pmQuery;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hotel Ticketing System//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:Hotel IT Calendar`];
  const formatDate = dateString => {
    const d = new Date(dateString);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  };
  const formatAllDay = dateString => {
    const d = new Date(dateString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  const now = formatDate(new Date());
  tickets.forEach(ticket => {
    lines.push('BEGIN:VEVENT', `UID:ticket-${ticket.id}@hotelticketing`, `DTSTAMP:${now}`, `DTSTART:${formatDate(ticket.resolution_due_at)}`, `DTEND:${formatDate(ticket.resolution_due_at)}`, `SUMMARY:Ticket ${ticket.ticket_number}: ${ticket.title}`, `DESCRIPTION:${(ticket.description || '').replace(/\n/g, '\\n')}`, `STATUS:CONFIRMED`, 'END:VEVENT');
  });
  pmTasks.forEach(pm => {
    const assetName = pm.asset_name ? ` (${pm.asset_name})` : '';
    lines.push('BEGIN:VEVENT', `UID:pm-${pm.id}@hotelticketing`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${formatAllDay(pm.next_due_date)}`, `SUMMARY:PM: ${pm.title}${assetName}`, `DESCRIPTION:${(pm.description || '').replace(/\n/g, '\\n')}`, `STATUS:CONFIRMED`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="hotel_tickets.ics"',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.send(lines.join('\r\n'));
}));

// PUT /api/calendar/reschedule (Authenticated, Manager/Admin only)
router.put('/reschedule', authenticate, asyncHandler(async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only managers and admins can reschedule items.' });
  }

  const { itemType, itemId, newDate, reason } = req.body;

  if (!itemType || !itemId || !newDate) {
    return res.status(400).json({ error: 'itemType, itemId, and newDate are required.' });
  }

  if (itemType === 'ticket') {
    const ticket = await db('tickets').where({ id: itemId }).whereNull('deleted_at').first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    await db('tickets').where({ id: itemId }).update({ resolution_due_at: new Date(newDate) });

    // Log the reschedule in activity logs
    await db('activity_logs').insert({
      ticket_id: itemId,
      user_id: req.user.id,
      action: 'deadline_rescheduled',
      old_value: ticket.resolution_due_at ? ticket.resolution_due_at.toISOString() : null,
      new_value: new Date(newDate).toISOString(),
      note: reason || 'Rescheduled via calendar',
      created_at: new Date()
    });

    res.json({ message: 'Ticket deadline updated.' });
  } else if (itemType === 'pm') {
    const pm = await db('preventive_maintenance').where({ id: itemId }).first();
    if (!pm) return res.status(404).json({ error: 'PM schedule not found.' });

    await db('preventive_maintenance').where({ id: itemId }).update({ next_due_date: newDate });

    res.json({ message: 'PM schedule updated.' });
  } else {
    return res.status(400).json({ error: 'Invalid itemType. Must be "ticket" or "pm".' });
  }
}));

export default router;