/**
 * Structured application logger.
 * Replaces raw console.log/console.error usage to provide standard formatting,
 * timestamping, and future extensibility (e.g., shipping to Datadog/Sentry).
 */

const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
};

export const logger = {
  info: (message, meta = {}) => {
    console.log(formatMessage('info', message, meta));
  },
  warn: (message, meta = {}) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message, error = null, meta = {}) => {
    const errorDetails = error ? (error.stack || error.message || error) : '';
    console.error(formatMessage('error', message, meta));
    if (errorDetails) {
      console.error(errorDetails);
    }
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, meta));
    }
  }
};
