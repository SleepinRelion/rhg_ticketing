import { asyncHandler } from "../utils/asyncHandler.js";
import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { publicEndpointLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../middleware/upload.js';
import { sanitize } from '../utils/sanitize.js';
import fs from 'fs';
import path from 'path';
const router = Router();

// GET /api/hotels - Get hotels user has access to
router.get('/', authenticate, asyncHandler(async (req, res) => {
  let query = db('hotels').where('is_active', true).orderBy('name');

  // Admins and Managers have access to all hotels
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    query = query.whereIn('id', req.user.hotelIds);
  }
  const hotels = await query;
  res.json({
    hotels,
    activeHotelId: req.user.activeHotelId
  });
}));

// GET /api/hotels/public - Get all active hotels for guest portal
router.get('/public', publicEndpointLimiter, asyncHandler(async (req, res) => {
  const hotels = await db('hotels').where({
    is_active: true
  }).select('id', 'name', 'wallpaper_url');
  
  const transformed = hotels.map(h => ({
    ...h,
    wallpaper_url: h.wallpaper_url ? `/api/hotels/public/wallpaper/${h.id}?_t=${Date.now()}` : null
  }));
  
  res.json({ hotels: transformed });
}));

// GET /api/hotels/public/wallpaper/:id - Serve wallpaper publicly for login page
router.get('/public/wallpaper/:id', publicEndpointLimiter, asyncHandler(async (req, res) => {
  const hotel = await db('hotels').where({ id: req.params.id }).first();
  if (!hotel || !hotel.wallpaper_url) return res.status(404).send('Wallpaper not found');
  
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const relativePath = hotel.wallpaper_url.replace('/uploads/', '');
  const filePath = path.join(uploadDir, relativePath);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.sendFile(filePath);
}));

// PUT /api/hotels/:id - Update hotel
router.put('/:id', authenticate, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
  const { name, is_active } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = sanitize(name);
  if (is_active !== undefined) updates.is_active = is_active;
  
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date();
    await db('hotels').where({ id: req.params.id }).update(updates);
  }
  const hotel = await db('hotels').where({ id: req.params.id }).first();
  res.json({ hotel });
}));

// POST /api/hotels/:id/wallpaper - Upload wallpaper
router.post('/:id/wallpaper', authenticate, authorize('admin', 'manager'), upload.single('wallpaper'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  
  const dateFolder = new Date().toISOString().split('T')[0];
  const wallpaperUrl = `/uploads/${dateFolder}/${req.file.filename}`;
  await db('hotels').where({ id: req.params.id }).update({
    wallpaper_url: wallpaperUrl,
    updated_at: new Date()
  });
  
  const hotel = await db('hotels').where({ id: req.params.id }).first();
  res.json({ hotel });
}));

export default router;