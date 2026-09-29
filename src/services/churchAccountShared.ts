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
 * Maps a Church Code to the synthetic Firebase Auth email it signs in with.
 * Firebase Auth only accepts email-shaped identifiers, but the UI only ever
 * asks the user for their Church Code - this mapping stays server-side.
 * e.g. CH-KBS -> ch-kbs@ron.org
 */
export function churchCodeToAuthEmail(code: string): string {
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
