/**
 * Zod validation middleware wrapper.
 * Usage: validate(schema) or validate(schema, 'query') or validate(schema, 'params')
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      // Replace request data with parsed (and transformed) data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({ error: 'Validation service error.' });
    }
  };
}
