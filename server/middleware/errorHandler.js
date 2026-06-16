import logger from '../config/logger.js';

/**
 * Global error handler middleware.
 * Never exposes stack traces to clients in production.
 */
export function errorHandler(err, req, res, _next) {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, code: err.code });

  // Knex/database errors
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: 'A required field is missing.' });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large. Maximum size is 10MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token has expired.' });
  }

  // Default
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
