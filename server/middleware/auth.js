import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';
import db from '../config/database.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
    }

    const token = authHeader.split(' ')[1];
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

    // Fetch user's allowed hotels
    const userHotels = await db('user_hotels').where('user_id', user.id);
    const hotelIds = userHotels.map(uh => uh.hotel_id);

    // Determine active hotel context
    const requestedHotelId = req.headers['x-hotel-id'] ? parseInt(req.headers['x-hotel-id']) : null;
    let activeHotelId = user.primary_hotel_id;

    if (requestedHotelId && hotelIds.includes(requestedHotelId)) {
      activeHotelId = requestedHotelId;
    } else if (hotelIds.length > 0 && !hotelIds.includes(activeHotelId)) {
      activeHotelId = hotelIds[0];
    }

    // Attach user to request (excluding sensitive fields)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      mfaEnabled: user.mfa_enabled,
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
