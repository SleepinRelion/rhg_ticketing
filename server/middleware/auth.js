import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';
import db from '../config/database.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired. Please refresh your session.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Verify user still exists and is active
    const user = await db('users')
      .where({ id: decoded.userId })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      return res.status(401).json({ error: 'User account not found or has been deactivated.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
    }

    // Fetch user's allowed hotels (resilient to missing data)
    let hotelIds = [];
    let activeHotelId = null;
    try {
      const userHotels = await db('user_hotels').where('user_id', user.id);
      hotelIds = userHotels.map(uh => parseInt(uh.hotel_id, 10));

      // Admin and Manager have access to all hotels implicitly
      if (user.role === 'admin' || user.role === 'manager') {
        const allHotels = await db('hotels').where('is_active', true);
        hotelIds = allHotels.map(h => parseInt(h.id, 10));
      }

      // Determine active hotel context
      const requestedHotelIdStr = req.headers['x-hotel-id'];
      
      if (requestedHotelIdStr === 'all' && (user.role === 'admin' || user.role === 'manager')) {
        activeHotelId = 'all';
      } else {
        const requestedHotelId = requestedHotelIdStr ? parseInt(requestedHotelIdStr, 10) : null;
        activeHotelId = user.primary_hotel_id ? parseInt(user.primary_hotel_id, 10) : null;

        if (requestedHotelId && hotelIds.includes(requestedHotelId)) {
          activeHotelId = requestedHotelId;
        } else if (hotelIds.length > 0 && !hotelIds.includes(activeHotelId)) {
          activeHotelId = hotelIds[0];
        }
      }
    } catch (hotelErr) {
      // If user_hotels table doesn't exist or query fails, proceed without hotel context
      console.warn('Hotel context unavailable:', hotelErr.message);
    }

    // Attach user to request (excluding sensitive fields)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      mfaEnabled: user.mfa_enabled,
      avatar_url: user.avatar_url,
      hotelIds,
      activeHotelId,
    };

    // Compulsory MFA Check
    if (!user.mfa_enabled) {
      const allowedPaths = ['/api/auth/mfa/setup', '/api/auth/mfa/verify', '/api/auth/logout', '/api/auth/me'];
      // Allow if the URL is strictly one of the allowed paths
      const isAllowed = allowedPaths.some(path => req.originalUrl === path || req.originalUrl.startsWith(path + '?'));
      
      if (!isAllowed) {
        return res.status(403).json({ error: 'MFA setup is required to access this resource.', mfaSetupRequired: true });
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication service error.' });
  }
}
