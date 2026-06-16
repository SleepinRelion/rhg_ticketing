import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user text input to prevent XSS.
 * Strips all HTML tags by default.
 */
export function sanitize(input) {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

/**
 * Sanitize but allow basic formatting (for knowledge base articles, etc.)
 */
export function sanitizeRich(input) {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h3', 'h4', 'code', 'pre'],
    allowedAttributes: {},
  }).trim();
}
