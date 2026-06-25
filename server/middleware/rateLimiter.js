import rateLimit from 'express-rate-limit';

/**
 * Global API rate limiter to prevent general DDoS/scraping.
 * 300 requests per 15 minutes per IP.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Very high limit for internal shared-IP networks
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5'),
  message: { error: 'Too many login attempts for this account. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // On an intranet, many users share the same IP. 
    // Rate limit based on the targeted account instead of the shared IP.
    return req.body.email ? req.body.email.trim().toLowerCase() : req.ip;
  }
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


