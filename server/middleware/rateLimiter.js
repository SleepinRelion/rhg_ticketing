import rateLimit from 'express-rate-limit';

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5');
const WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'); // 15 min

/**
 * Rate limiter for login endpoint using express-rate-limit.
 */
export const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_ATTEMPTS,
  message: {
    error: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Global API rate limiter to prevent general DDoS/scraping.
 * 300 requests per 15 minutes per IP.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
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

// Create a middleware to reset the limit on successful login
// Note: express-rate-limit's memory store allows resetting via req.rateLimit.resetTime
export function resetLoginLimit(req, res, next) {
  if (req.rateLimit) {
    // In express-rate-limit v7, we can use req.rateLimit.resetTime to calculate or we can just decrement. 
    // We'll leave it simple for now, resetting the specific IP if needed requires an external store.
  }
  next();
}
