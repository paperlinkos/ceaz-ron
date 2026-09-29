import { DEFAULT_CHURCHES, DEFAULT_GROUPS } from './organizationService';
import { OFFICIAL_TARGET_MAP } from './targetService';
import { isValidPhoneNumber, isNonEmptyText } from '../utils/validation';

export interface ChurchRepresentative {
  name: string;
  email: string;
  phone: string;
  activatedAt: string;
}

export interface ChurchAccount {
  churchId: string;
  churchName: string;
  churchCode: string; // Official username, e.g. "CH-KBS", "CH-GWARINPA1"
  defaultPassword: string; // e.g. "CEAZ1@KBS", "CEAZ1@GWARINPA1"
  groupId: string;
  groupName: string;
  groupCode: string;
  targetSouls: number;
  status: 'pending_activation' | 'activated';
  representative?: ChurchRepresentative;
  createdAt: string;
  updatedAt: string;
}

const CHURCH_ACCOUNTS_STORAGE_KEY = 'ron_church_accounts';

/**
 * Generates an intuitive, secure default password from the church code.
 * e.g. CH-KBS -> CEAZ1@KBS, CH-GWARINPA1 -> CEAZ1@GWARINPA1
 */
export function generateDefaultPassword(code: string): string {
  const cleanSuffix = code.replace(/^CH-?/i, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `CEAZ1@${cleanSuffix || 'CHURCH'}`;
}

/**
 * Initializes and retrieves all church representative accounts.
 * Seeds from DEFAULT_CHURCHES, DEFAULT_GROUPS, and OFFICIAL_TARGET_MAP if not cached.
 */
export function getChurchAccounts(): ChurchAccount[] {
  try {
    const raw = localStorage.getItem(CHURCH_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached church accounts:', err);
  }

  // Generate accounts for all churches in Abuja Zone 1
  const accounts: ChurchAccount[] = DEFAULT_CHURCHES.map((church) => {
    const group = DEFAULT_GROUPS.find((g) => g.id === church.groupId);
    const targetEntry = OFFICIAL_TARGET_MAP.find((t) => t.orgId === church.id);
    const target = targetEntry ? targetEntry.target : 200;
    const nowIso = new Date().toISOString();

    return {
      churchId: church.id,
      churchName: church.name,
      churchCode: church.code.toUpperCase(),
      defaultPassword: generateDefaultPassword(church.code),
      groupId: church.groupId,
      groupName: group ? group.name : 'Abuja Zone 1 Group',
      groupCode: group ? group.code : 'GRP-ABZ',
      targetSouls: target,
      status: 'pending_activation',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  saveChurchAccounts(accounts);
  return accounts;
}

export function saveChurchAccounts(accounts: ChurchAccount[]) {
  try {
    localStorage.setItem(CHURCH_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Failed to save church accounts:', err);
  }
}

/**
 * Looks up a church account by Church Code (case-insensitive) or by representative email.
 */
export function findChurchAccount(identifier: string): ChurchAccount | undefined {
  const accounts = getChurchAccounts();
  const clean = identifier.trim().toLowerCase();
  return accounts.find(
    (acc) =>
      acc.churchCode.toLowerCase() === clean ||
      acc.churchId.toLowerCase() === clean ||
      (acc.representative && acc.representative.email.toLowerCase() === clean)
  );
}

/**
 * Authenticates a Church Representative using either:
 * - Church Code as username (e.g. CH-KBS or ch-kbs) + Password
 * - Activated Representative Email + Password
 */
export function authenticateChurchCredentials(
  username: string,
  pass: string
): {
  success: boolean;
  account?: ChurchAccount;
  requiresActivation?: boolean;
  error?: string;
} {
  const cleanUser = username.trim();
  const cleanPass = pass.trim();

  if (!cleanUser) {
    return { success: false, error: 'Please enter your Church Code or Email.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Please enter your Password.' };
  }

  const account = findChurchAccount(cleanUser);
  if (!account) {
    return {
      success: false,
      error: `No church account found matching "${cleanUser}". Please enter your official Church Code (e.g. CH-KBS).`,
    };
  }

  // Verify password (case-sensitive check against default or representative password)
  if (account.defaultPassword !== cleanPass) {
    return {
      success: false,
      error: 'Invalid password. Please check your credentials or contact zonal admin.',
    };
  }

  if (account.status === 'pending_activation') {
    return {
      success: true,
      account,
      requiresActivation: true,
    };
  }

  return {
    success: true,
    account,
    requiresActivation: false,
  };
}

/**
 * Activates a church representative account by storing representative name, email, and phone.
 */
export function activateChurchAccount(
  churchCode: string,
  repData: { name: string; email: string; phone: string; newPassword?: string }
): { success: boolean; account?: ChurchAccount; error?: string } {
  const accounts = getChurchAccounts();
  const index = accounts.findIndex(
    (acc) => acc.churchCode.toLowerCase() === churchCode.trim().toLowerCase()
  );

  if (index === -1) {
    return { success: false, error: 'Church account not found.' };
  }

  const name = repData.name.trim();
  const email = repData.email.trim().toLowerCase();
  const phone = repData.phone.trim();

  if (!isNonEmptyText(name)) {
    return { success: false, error: 'Please enter the Representative Full Name.' };
  }

  // Simple valid email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Please enter a valid representative email address.' };
  }

  if (!isNonEmptyText(phone) || !isValidPhoneNumber(phone)) {
    return { success: false, error: 'Please enter a valid phone number (at least 7 digits).' };
  }

  const nowIso = new Date().toISOString();
  const targetAcc = accounts[index];

  targetAcc.representative = {
    name,
    email,
    phone,
    activatedAt: nowIso,
  };
  targetAcc.status = 'activated';
  targetAcc.updatedAt = nowIso;

  if (repData.newPassword && repData.newPassword.trim().length >= 6) {
    targetAcc.defaultPassword = repData.newPassword.trim();
  }

  accounts[index] = targetAcc;
  saveChurchAccounts(accounts);

  return { success: true, account: targetAcc };
}

/**
 * Exports all Church Representative Accounts to an Excel-compatible CSV file (with UTF-8 BOM).
 */
export function exportChurchAccountsToExcelCSV(): void {
  const accounts = getChurchAccounts();

  const headers = [
    'Church Name',
    'Church Code (Username)',
    'Password',
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
    `"${acc.defaultPassword}"`,
    `"${acc.groupName.replace(/"/g, '""')}"`,
    `"${acc.groupCode}"`,
    acc.targetSouls.toString(),
    acc.status === 'activated' ? 'Activated' : 'Pending Activation',
    acc.representative ? `"${acc.representative.name.replace(/"/g, '""')}"` : '""',
    acc.representative ? `"${acc.representative.email}"` : '""',
    acc.representative ? `"${acc.representative.phone}"` : '""',
    acc.representative ? `"${new Date(acc.representative.activatedAt).toLocaleString()}"` : '""',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CEAZ1_Church_Representative_Accounts_${new Date().toISOString().slice(0, 10)}.csv`);
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
    '\uFEFF' +
    [
      headers.join(','),
      ...sampleRows.map((r) => r.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

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
  if (lines.length === 0) {
    return { items: [], validCount: 0, invalidCount: 0 };
  }

  // Remove header line if present
  let dataLines = lines;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('name') && (firstLine.includes('phone') || firstLine.includes('born'))) {
    dataLines = lines.slice(1);
  }

  const items: ParsedSoulItem[] = [];
  let validCount = 0;
  let invalidCount = 0;

  dataLines.forEach((line, index) => {
    // Basic CSV splitting handling quotes
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

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    items.push({
      rowIndex: index + 2, // 1-indexed plus header
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
