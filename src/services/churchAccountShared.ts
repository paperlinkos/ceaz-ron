/**
 * Pure helpers shared by the browser app and the Vercel provisioning function.
 * Both sides must derive identical emails and passwords, so neither may
 * keep its own copy of this logic.
 */

export const CHURCH_ACCOUNTS_COLLECTION = 'churchAccounts';

/** Domain used to build the synthetic auth email behind a church code. */
export const RON_AUTH_DOMAIN = 'ron.org';

/**
 * Generates the standard password for a church code.
 * e.g. CH-KBS -> CEAZ1@KBS, CH-GWARINPA1 -> CEAZ1@GWARINPA1
 */
export function generateDefaultPassword(code: string): string {
  const cleanSuffix = code.replace(/^CH-?/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `CEAZ1@${cleanSuffix || 'CHURCH'}`;
}

/**
 * Generates an unpredictable password for password resets.
 *
 * Resets must NOT reuse generateDefaultPassword: that value is derived purely
 * from the public church code, so "resetting" would hand back the same
 * password and quietly fail to revoke access.
 */
export function generateResetPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `CEAZ1-${out}`;
}

/**
 * Generates a strong password for a newly provisioned church account.
 *
 * Unlike generateDefaultPassword, this does not depend on the church code, so
 * publishing the church roster does not expose anyone's sign-in.
 */
export function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*';
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const chars = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];
  for (let i = 4; i < bytes.length; i++) chars.push(all[bytes[i] % all.length]);
  // Fisher-Yates with the same random source, so the guaranteed classes
  // above cannot be guessed from their position.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i % bytes.length] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return `Ceaz1!${chars.join('')}`;
}

/**
 * Maps a Church Code to the synthetic Firebase Auth email it signs in with.
 * Firebase Auth only accepts email-shaped identifiers, but the UI only ever
 * asks the user for their Church Code - this mapping stays server-side.
 * e.g. CH-KBS -> ch-kbs@ron.org
 */
export function churchCodeToAuthEmail(code: string): string {
  const clean = code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (clean === 'bitw' || clean === 'bitw1' || clean === 'chbitw' || clean === 'chbitw1' || clean === 'chznc1bitw' || clean === 'bitwfirstservice') {
    return `ch-znc1-bitw@${RON_AUTH_DOMAIN}`;
  }
  if (clean === 'dynamic' || clean === 'dynamicpcf' || clean === 'chdynamic' || clean === 'chznc1dyn') {
    return `ch-znc1-dyn@${RON_AUTH_DOMAIN}`;
  }
  if (clean === 'huios' || clean === 'huiospcf' || clean === 'chhuios' || clean === 'chznc1huios') {
    return `ch-znc1-huios@${RON_AUTH_DOMAIN}`;
  }

  const local = code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${local || 'church'}@${RON_AUTH_DOMAIN}`;
}

export interface ChurchAccountRecord {
  churchId: string;
  churchName: string;
  churchCode: string;
  /** Firebase Auth uid backing this church code. */
  uid: string;
  /** Synthetic email the church code resolves to. Never shown to the rep. */
  loginEmail: string;
  groupId: string;
  groupName: string;
  targetSouls: number;
  status: 'active' | 'suspended';
  representative?: {
    name: string;
    email: string;
    phone: string;
    activatedAt: string;
  };
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
