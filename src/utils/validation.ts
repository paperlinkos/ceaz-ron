/**
 * Basic phone number validator for Phase 1.
 * Ensures the value contains digits and valid formatting characters (+, -, spaces, parens)
 * with at least 7 digits.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || !phone.trim()) return false;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  // Must consist of digits only after stripping format characters and have a reasonable length (7-15 digits)
  return /^\d{7,15}$/.test(cleaned);
}

/** Basic non-empty text validator */
export function isNonEmptyText(text: string): boolean {
  return Boolean(text && text.trim().length > 0);
}
