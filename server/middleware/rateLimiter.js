import rateLimit from 'express-rate-limit';

/**
 * Global API rate limiter — disabled for intranet deployments.
 * On an intranet, all users share one IP behind the gateway, so
 * IP-based rate limiting blocks everyone when one person is active.
 * Brute-force protection is handled at the database level (account lockout
 * after 5 failed attempts).
 */
export const globalApiLimiter = (req, res, next) => next(); // pass-through

/**
 * Rate limiter for guest/staff ticket creation to prevent spam.
 * 50 requests per hour per IP (allows staff to submit multiple legitimate issues).
 */
export const guestTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'You have reached the maximum number of tickets you can submit. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Moderate rate limiter for public endpoints (hotels, rooms, tracking).
 * 30 requests per 10 minutes per IP.
 */
export const publicEndpointLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  message: { error: 'Too many requests. Please wait a few minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
