import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { publicEndpointLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /api/hotels - Get hotels user has access to
router.get('/', authenticate, async (req, res) => {
  try {
    let query = db('hotels').where('is_active', true).orderBy('name');
    
    // Admins and Managers have access to all hotels
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      query = query.whereIn('id', req.user.hotelIds);
    }
    
    const hotels = await query;
      
    res.json({ hotels, activeHotelId: req.user.activeHotelId });
  } catch (error) {
    console.error('List hotels error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels.' });
  }
});

// GET /api/hotels/public - Get all active hotels for guest portal
router.get('/public', publicEndpointLimiter, async (req, res) => {
  try {
    const hotels = await db('hotels').where({ is_active: true }).select('id', 'name');
    res.json({ hotels });
  } catch (error) {
    console.error('List public hotels error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels.' });
  }
});

export default router;
