import { describe, it, expect } from 'vitest';
import { isValidPhoneNumber, isNonEmptyText } from '../src/utils/validation';
import { generateUUID } from '../src/utils/uuid';

describe('Form Validation Utilities', () => {
  it('validates phone numbers correctly', () => {
    expect(isValidPhoneNumber('08012345678')).toBe(true);
    expect(isValidPhoneNumber('+2348012345678')).toBe(true);
    expect(isValidPhoneNumber('080-1234-5678')).toBe(true);
    expect(isValidPhoneNumber('080 1234 5678')).toBe(true);

    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber('123')).toBe(false); // Too short
    expect(isValidPhoneNumber('abc123456789')).toBe(false); // Letters
  });

  it('validates non-empty text inputs', () => {
    expect(isNonEmptyText('Wuse Market')).toBe(true);
    expect(isNonEmptyText('  John Doe  ')).toBe(true);
    expect(isNonEmptyText('')).toBe(false);
    expect(isNonEmptyText('   ')).toBe(false);
  });

  it('generates valid UUID v4 strings for idempotent document IDs', () => {
    const id1 = generateUUID();
    const id2 = generateUUID();
    expect(id1).toBeTypeOf('string');
    expect(id1.length).toBeGreaterThan(20);
    expect(id1).not.toEqual(id2);
  });
});
