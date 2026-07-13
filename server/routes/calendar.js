import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// GET /api/calendar/token (Authenticated)
router.get('/token', authenticate, async (req, res) => {
  try {
    const hotelId = req.headers['x-hotel-id'];
    if (!hotelId) return res.status(400).json({ error: 'Hotel context is required.' });

    let setting = await db('settings').where({ hotel_id: hotelId, key: 'CALENDAR_FEED_TOKEN' }).first();
    let token;

    if (!setting) {
      token = crypto.randomUUID();
      await db('settings').insert({
        hotel_id: hotelId,
        key: 'CALENDAR_FEED_TOKEN',
        value: token
      });
    } else {
      token = setting.value;
    }

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const feedUrl = `${baseUrl}/api/calendar/feed/${hotelId}/${token}.ics`;

    res.json({ token, feedUrl });
  } catch (error) {
    console.error('Calendar token error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar token' });
  }
});

// GET /api/calendar/feed/:hotelId/:token.ics (Public)
router.get('/feed/:hotelId/:token.ics', async (req, res) => {
  try {
    const { hotelId, token } = req.params;

    const setting = await db('settings').where({ hotel_id: hotelId, key: 'CALENDAR_FEED_TOKEN', value: token }).first();
    if (!setting) {
      return res.status(403).send('Invalid or expired calendar feed token.');
    }

    const tickets = await db('tickets')
      .where({ hotel_id: hotelId })
      .whereNotNull('resolution_due_at')
      .whereIn('status', ['open', 'in_progress', 'assigned', 'waiting_for_parts', 'waiting_for_vendor', 'waiting_for_guest']);

    // Preventive Maintenance is linked to assets, which are linked to hotels. Or wait, let's just use a join to filter PMs by hotel.
    const pmTasks = await db('preventive_maintenance')
      .select('preventive_maintenance.*', 'assets.name as asset_name')
      .join('assets', 'preventive_maintenance.asset_id', 'assets.id')
      .where('assets.hotel_id', hotelId)
      .where('preventive_maintenance.is_active', true)
      .whereNotNull('preventive_maintenance.next_due_date');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hotel Ticketing System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Hotel IT Calendar`
    ];

    const formatDate = (dateString) => {
      const d = new Date(dateString);
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
    };
    
    const formatAllDay = (dateString) => {
      const d = new Date(dateString);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const now = formatDate(new Date());

    tickets.forEach(ticket => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:ticket-${ticket.id}@hotelticketing`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatDate(ticket.resolution_due_at)}`,
        `DTEND:${formatDate(ticket.resolution_due_at)}`,
        `SUMMARY:Ticket ${ticket.ticket_number}: ${ticket.title}`,
        `DESCRIPTION:${(ticket.description || '').replace(/\n/g, '\\n')}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT'
      );
    });

    pmTasks.forEach(pm => {
      const assetName = pm.asset_name ? ` (${pm.asset_name})` : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:pm-${pm.id}@hotelticketing`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${formatAllDay(pm.next_due_date)}`,
        `SUMMARY:PM: ${pm.title}${assetName}`,
        `DESCRIPTION:${(pm.description || '').replace(/\n/g, '\\n')}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT'
      );
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

  } catch (error) {
    console.error('ICS generation error:', error);
    res.status(500).send('Internal server error while generating calendar feed.');
  }
});

export default router;
