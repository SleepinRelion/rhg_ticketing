/**
 * Wraps async route handlers to automatically catch unhandled promises
 * and pass them to the Express error handling middleware.
 * Eliminates the need for boilerplate try/catch blocks in every controller.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
