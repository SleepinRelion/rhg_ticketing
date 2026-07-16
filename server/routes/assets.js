import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sanitize } from '../utils/sanitize.js';
const router = Router();

// GET /api/assets
router.get('/', authenticate, authorize('admin', 'manager', 'technician'), asyncHandler(async (req, res) => {
  const {
    status,
    category_id,
    room_id,
    search
  } = req.query;
  let query = db('assets').select('assets.*', 'categories.name as category_name', 'rooms.room_number').leftJoin('categories', 'assets.category_id', 'categories.id').leftJoin('rooms', 'assets.room_id', 'rooms.id').where('assets.is_active', true);
  if (req.user.activeHotelId) query = query.where('assets.hotel_id', req.user.activeHotelId);
  if (status) query = query.where('assets.status', status);
  if (category_id) query = query.where('assets.category_id', category_id);
  if (room_id) query = query.where('assets.room_id', room_id);
  if (search) {
    const s = `%${search}%`;
    query = query.where(function () {
      this.where('assets.name', 'like', s).orWhere('assets.asset_tag', 'like', s).orWhere('assets.serial_number', 'like', s);
    });
  }
  const assets = await query.orderBy('assets.name', 'asc');
  res.json({
    assets
  });
}));

// GET /api/assets/:id — Full detail with history
router.get('/:id', authenticate, authorize('admin', 'manager', 'technician'), asyncHandler(async (req, res) => {
  let query = db('assets').select('assets.*', 'categories.name as category_name', 'rooms.room_number').leftJoin('categories', 'assets.category_id', 'categories.id').leftJoin('rooms', 'assets.room_id', 'rooms.id').where('assets.id', req.params.id);
  if (req.user.activeHotelId) {
    query = query.where('assets.hotel_id', req.user.activeHotelId);
  }
  const asset = await query.first();
  if (!asset) return res.status(404).json({
    error: 'Asset not found.'
  });
  const [openTickets, closedTickets, interventions, preventiveMaintenance] = await Promise.all([db('tickets').where({
    asset_id: asset.id
  }).whereNotIn('status', ['closed', 'cancelled']).whereNull('deleted_at').orderBy('created_at', 'desc'), db('tickets').where({
    asset_id: asset.id
  }).whereIn('status', ['closed', 'resolved']).whereNull('deleted_at').orderBy('created_at', 'desc').limit(50), db('interventions').select('interventions.*', 'users.full_name as technician_name', 'tickets.ticket_number').join('users', 'interventions.technician_id', 'users.id').join('tickets', 'interventions.ticket_id', 'tickets.id').where('tickets.asset_id', asset.id).orderBy('interventions.created_at', 'desc'), db('preventive_maintenance').select('preventive_maintenance.*', 'users.full_name as assigned_to_name').leftJoin('users', 'preventive_maintenance.assigned_to', 'users.id').where('preventive_maintenance.asset_id', asset.id).orderBy('next_due_date', 'asc')]);

  // Calculate total downtime (sum of intervention durations)
  const totalDowntimeMinutes = interventions.reduce((sum, i) => sum + (i.duration_minutes || 0), 0);
  res.json({
    asset,
    open_tickets: openTickets,
    closed_tickets: closedTickets,
    interventions,
    preventive_maintenance: preventiveMaintenance,
    stats: {
      total_tickets: openTickets.length + closedTickets.length,
      total_interventions: interventions.length,
      total_downtime_minutes: totalDowntimeMinutes,
      last_serviced: asset.last_serviced_at,
      next_maintenance: asset.next_maintenance_date
    }
  });
}));

// POST /api/assets
router.post('/', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.name || !data.asset_tag) return res.status(400).json({
    error: 'Name and asset tag are required.'
  });
  const [asset] = await db('assets').insert({
    name: sanitize(data.name),
    asset_tag: sanitize(data.asset_tag),
    category_id: data.category_id || null,
    room_id: data.room_id || null,
    hotel_id: req.user.activeHotelId,
    location: data.location ? sanitize(data.location) : null,
    manufacturer: data.manufacturer ? sanitize(data.manufacturer) : null,
    model: data.model ? sanitize(data.model) : null,
    serial_number: data.serial_number ? sanitize(data.serial_number) : null,
    purchase_date: data.purchase_date || null,
    warranty_expiry: data.warranty_expiry || null,
    status: 'operational',
    notes: data.notes ? sanitize(data.notes) : null,
    created_at: new Date(),
    updated_at: new Date()
  }).returning('*');
  res.status(201).json(asset);
}));

// POST /api/assets/bulk
router.post('/bulk', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const {
    assets
  } = req.body;
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({
      error: 'Assets array is required.'
    });
  }
  const insertedAssets = [];
  await db.transaction(async trx => {
    for (const data of assets) {
      if (!data.name || !data.asset_tag) continue;
      const result = await trx('assets').insert({
        name: sanitize(data.name),
        asset_tag: sanitize(data.asset_tag),
        category_id: data.category_id || null,
        room_id: data.room_id || null,
        hotel_id: req.user.activeHotelId,
        location: data.location ? sanitize(data.location) : null,
        manufacturer: data.manufacturer ? sanitize(data.manufacturer) : null,
        model: data.model ? sanitize(data.model) : null,
        serial_number: data.serial_number ? sanitize(data.serial_number) : null,
        status: 'operational',
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict('asset_tag').ignore().returning('*');
      if (result && result.length > 0) {
        insertedAssets.push(result[0]);
      }
    }
  });
  res.status(201).json({
    success: true,
    count: insertedAssets.length,
    assets: insertedAssets
  });
}));

// PUT /api/assets/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const allowed = ['name', 'asset_tag', 'category_id', 'room_id', 'location', 'manufacturer', 'model', 'serial_number', 'purchase_date', 'warranty_expiry', 'status', 'notes', 'next_maintenance_date'];
  const updates = {
    updated_at: new Date()
  };
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = typeof req.body[f] === 'string' ? sanitize(req.body[f]) : req.body[f];
  }
  const query = db('assets').where({
    id: req.params.id
  });
  if (req.user.activeHotelId) query.where({
    hotel_id: req.user.activeHotelId
  });
  await query.update(updates);
  const asset = await db('assets').where({
    id: req.params.id
  }).first();
  res.json(asset);
}));

// DELETE /api/assets/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const hotelId = req.headers['x-hotel-id'] || req.user.primary_hotel_id;
  try {
    await db('assets').where({
      id: req.params.id,
      hotel_id: hotelId
    }).del();
    res.json({
      message: 'Asset deleted successfully.'
    });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT' || e.code === '23503') {
      return res.status(409).json({
        error: 'Cannot delete asset because it is referenced by existing tickets.'
      });
    }
    throw e;
  }
}));
export default router;