import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeRich } from '../../server/utils/sanitize.js';

describe('sanitize', () => {
  it('strips all HTML tags', () => {
    const input = '<p>Hello <b>World</b></p><script>alert("xss")</script>';
    const expected = 'Hello World';
    expect(sanitize(input)).toBe(expected);
  });

  it('trims whitespace', () => {
    const input = '   hello world   ';
    expect(sanitize(input)).toBe('hello world');
  });

  it('returns non-strings unchanged', () => {
    expect(sanitize(123)).toBe(123);
    expect(sanitize(null)).toBe(null);
    expect(sanitize(undefined)).toBe(undefined);
  });
});

describe('sanitizeRich', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <b>World</b></p>';
    expect(sanitizeRich(input)).toBe(input);
  });

  it('strips unsafe HTML tags like script', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const expected = '<p>Hello</p>';
    expect(sanitizeRich(input)).toBe(expected);
  });

  it('returns non-strings unchanged', () => {
    expect(sanitizeRich(123)).toBe(123);
  });
});
