import { auth } from './firebase';
import { isValidPhoneNumber, isNonEmptyText } from '../utils/validation';
import {
  generateDefaultPassword,
  churchCodeToAuthEmail,
  type ChurchAccountRecord,
} from './churchAccountShared';

export type ChurchAccount = ChurchAccountRecord;

export { generateDefaultPassword, churchCodeToAuthEmail };

const API_ENDPOINT = '/api/church-accounts';

async function callApi<T>(body: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in as a SuperAdmin to manage church accounts.');
  }
  const token = await user.getIdToken();

  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return data;
}

/**
 * Loads the pre-provisioned church accounts from Firestore.
 * These are created by a SuperAdmin through the provisioning endpoint;
 * there is no client-side seeding and no local storage of credentials.
 */
export async function getChurchAccounts(): Promise<ChurchAccount[]> {
  try {
    const { accounts } = await callApi<{ accounts: ChurchAccount[] }>({ action: 'list' });
    return accounts;
  } catch (err) {
    console.warn('Failed to load church accounts:', err);
    return [];
  }
}

/**
 * Creates a real Firebase Auth account for a church representative and
 * returns the credentials exactly once, for the admin to hand out.
 */
export async function createChurchAccount(input: {
  churchId: string;
  churchName: string;
  churchCode: string;
  groupId: string;
  groupName: string;
  targetSouls: number;
  repName: string;
  repEmail: string;
  repPhone: string;
}): Promise<{ account: ChurchAccount; credentials: { churchCode: string; password: string } }> {
  return callApi({ action: 'create', ...input });
}

/** Resets a church rep password. Omit newPassword to restore the default. */
export async function resetChurchAccountPassword(
  churchCode: string,
  newPassword?: string
): Promise<{ credentials: { churchCode: string; password: string } }> {
  return callApi({ action: 'reset', churchCode, newPassword });
}

/** Suspends (disables) or reactivates a church rep account. */
export async function setChurchAccountStatus(
  churchCode: string,
  status: 'active' | 'suspended'
): Promise<void> {
  await callApi({ action: 'setStatus', churchCode, status });
}

/** Permanently deletes the church rep's Firebase Auth account. */
export async function deleteChurchAccount(churchCode: string): Promise<void> {
  await callApi({ action: 'delete', churchCode });
}

/**
 * Exports the current church accounts as a CSV for distribution.
 * Passwords are never included: they are only ever shown once, at creation
 * or reset time, in the admin's own browser.
 */
export function exportChurchAccountsToExcelCSV(accounts: ChurchAccount[]): void {
  const headers = [
    'Church Name',
    'Church Code (Username)',
    'Parent Group',
    'Group Code',
    'Target Souls',
    'Account Status',
    'Representative Name',
    'Representative Email',
    'Representative Phone',
    'Activation Date',
  ];

  const rows = accounts.map((acc) => [
    `"${acc.churchName.replace(/"/g, '""')}"`,
    `"${acc.churchCode}"`,
    `"${acc.groupName.replace(/"/g, '""')}"`,
    `"${acc.groupId}"`,
    acc.targetSouls.toString(),
    acc.status === 'active' ? 'Active' : 'Suspended',
    acc.representative ? `"${acc.representative.name.replace(/"/g, '""')}"` : '""',
    acc.representative ? `"${acc.representative.email}"` : '""',
    acc.representative ? `"${acc.representative.phone}"` : '""',
    acc.representative ? `"${new Date(acc.representative.activatedAt).toLocaleString()}"` : '""',
  ]);

  const csvContent =
    '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `CEAZ1_Church_Representative_Accounts_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the standardized Bulk Soul Upload Template with the exact 4 requested headings:
 * Name, Phone Number, Born Again, Filled with the Spirit
 */
export function downloadSoulUploadTemplate(): void {
  const headers = ['Name', 'Phone Number', 'Born Again', 'Filled with the Spirit'];
  const sampleRows = [
    ['Brother David Emmanuel', '08031234567', 'Yes', 'Yes'],
    ['Sister Grace Okon', '08029876543', 'Yes', 'No'],
    ['Brother Samuel Ade', '08145556677', 'Yes', 'Yes'],
    ['Sister Maryam Bello', '09012348899', 'No', 'No'],
    ['Brother Joseph Dan', '08077712345', 'Yes', 'Yes'],
  ];

  const csvContent =
    '﻿' +
    [headers.join(','), ...sampleRows.map((r) => r.map((val) => `"${val}"`).join(','))].join(
      '\r\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'CEAZ1_Soul_Harvest_Upload_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedSoulItem {
  rowIndex: number;
  name: string;
  phone: string;
  isBornAgain: boolean;
  isFilledWithHolySpirit: boolean;
  isValid: boolean;
  error?: string;
}

/**
 * Parses and validates CSV content for bulk soul entries according to the template:
 * Name, Phone Number, Born Again, Filled with the Spirit
 */
export function parseBulkSoulCSV(csvText: string): {
  items: ParsedSoulItem[];
  validCount: number;
  invalidCount: number;
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { items: [], validCount: 0, invalidCount: 0 };

  let dataLines = lines;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('name') && (firstLine.includes('phone') || firstLine.includes('born'))) {
    dataLines = lines.slice(1);
  }

  const items: ParsedSoulItem[] = [];
  let validCount = 0;
  let invalidCount = 0;

  dataLines.forEach((line, index) => {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());

    const name = cells[0]?.replace(/^"|"$/g, '').trim() || '';
    const phone = cells[1]?.replace(/^"|"$/g, '').trim() || '';
    const bornAgainRaw = (cells[2]?.replace(/^"|"$/g, '').trim() || 'yes').toLowerCase();
    const filledRaw = (cells[3]?.replace(/^"|"$/g, '').trim() || 'yes').toLowerCase();

    const isBornAgain = ['yes', 'y', 'true', '1'].includes(bornAgainRaw);
    const isFilledWithHolySpirit = ['yes', 'y', 'true', '1'].includes(filledRaw);

    let isValid = true;
    let error = '';

    if (!isNonEmptyText(name)) {
      isValid = false;
      error = 'Missing name';
    } else if (!isNonEmptyText(phone)) {
      isValid = false;
      error = 'Missing phone number';
    } else if (!isValidPhoneNumber(phone)) {
      isValid = false;
      error = 'Invalid phone number format';
    }

    if (isValid) validCount++;
    else invalidCount++;

    items.push({
      rowIndex: index + 2,
      name,
      phone,
      isBornAgain,
      isFilledWithHolySpirit,
      isValid,
      error,
    });
  });

  return { items, validCount, invalidCount };
}
