import rateLimit from 'express-rate-limit';

/**
 * Global API rate limiter to prevent general DDoS/scraping.
 * 300 requests per 15 minutes per IP.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // High limit for internal shared-IP networks
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for guest/staff ticket creation to prevent spam.
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


