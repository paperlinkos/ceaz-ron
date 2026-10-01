import { doc, getDoc, setDoc, updateDoc, collection, getDocs, increment } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_CHURCHES, DEFAULT_GROUPS } from './organizationService';
import { churchCodeToAuthEmail } from './churchAccountShared';
import type { UserProfile, UserRole } from '../types/auth';

export interface AccountLoginRecord {
  id: string;                    // Unique identifier (UID, churchCode, or email)
  userId?: string;              // Firebase Auth UID if known
  accountName: string;          // Name of Church, Leader, or Admin
  email: string;                // Login Email or Synthetic Church Email
  churchCode?: string;          // e.g. CH-KBS, CH-GWARINPA1
  role: UserRole | string;      // churchManager, groupManager, superAdmin, etc.
  groupName?: string;           // Parent Group Name
  groupId?: string;
  churchName?: string;
  churchId?: string;
  hasLoggedIn: boolean;         // True if logged in at least once
  firstLoginAt?: string;        // ISO string of first login
  lastLoginAt?: string;         // ISO string of most recent login
  loginCount: number;           // Total count of logins
  lastDevice?: string;          // Browser / Device user agent
  soulsSubmitted?: number;      // Number of souls recorded by this account
}

export interface AccountLoginSummary {
  totalAccounts: number;
  loggedInCount: number;
  neverLoggedInCount: number;
  percentageLoggedIn: number;
  churchAccountsTotal: number;
  churchAccountsLoggedIn: number;
  groupAccountsTotal: number;
  groupAccountsLoggedIn: number;
  adminAccountsTotal: number;
  adminAccountsLoggedIn: number;
  lastActivityAt?: string;
}

const LOCAL_LOGIN_KEY = 'ron_account_login_tracker';

/**
 * Record a login event into Firestore and local cache.
 * Called automatically upon successful authentication.
 */
export async function recordAccountLogin(params: {
  userId: string;
  name: string;
  email: string;
  role: string;
  churchCode?: string;
  churchName?: string;
  groupName?: string;
  groupId?: string;
  churchId?: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const docId = params.churchCode
    ? params.churchCode.toUpperCase()
    : params.userId || params.email.replace(/[^a-zA-Z0-9]/g, '_');

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

  // 1. Update localStorage cache
  try {
    const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
    const cachedMap: Record<string, Partial<AccountLoginRecord>> = raw ? JSON.parse(raw) : {};
    const existing = cachedMap[docId];

    cachedMap[docId] = {
      id: docId,
      userId: params.userId,
      accountName: params.name,
      email: params.email,
      role: params.role,
      churchCode: params.churchCode,
      churchName: params.churchName,
      groupName: params.groupName,
      groupId: params.groupId,
      churchId: params.churchId,
      hasLoggedIn: true,
      firstLoginAt: existing?.firstLoginAt || nowIso,
      lastLoginAt: nowIso,
      loginCount: (existing?.loginCount || 0) + 1,
      lastDevice: userAgent,
    };
    localStorage.setItem(LOCAL_LOGIN_KEY, JSON.stringify(cachedMap));
  } catch (err) {
    console.warn('[LoginTracker] Local cache error:', err);
  }

  // 2. Persist to Firestore accountLogins collection
  if (navigator.onLine) {
    try {
      const loginDocRef = doc(db, 'accountLogins', docId);
      const snap = await getDoc(loginDocRef);

      if (snap.exists()) {
        const data = snap.data();
        await updateDoc(loginDocRef, {
          userId: params.userId,
          accountName: params.name || data.accountName,
          email: params.email || data.email,
          role: params.role || data.role,
          churchCode: params.churchCode || data.churchCode || '',
          churchName: params.churchName || data.churchName || '',
          groupName: params.groupName || data.groupName || '',
          hasLoggedIn: true,
          lastLoginAt: nowIso,
          loginCount: increment(1),
          lastDevice: userAgent,
          updatedAt: nowIso,
        });
      } else {
        await setDoc(loginDocRef, {
          id: docId,
          userId: params.userId,
          accountName: params.name,
          email: params.email,
          role: params.role,
          churchCode: params.churchCode || '',
          churchName: params.churchName || '',
          groupName: params.groupName || '',
          groupId: params.groupId || '',
          churchId: params.churchId || '',
          hasLoggedIn: true,
          firstLoginAt: nowIso,
          lastLoginAt: nowIso,
          loginCount: 1,
          lastDevice: userAgent,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    } catch (err) {
      console.warn('[LoginTracker] Firestore log error:', err);
    }

    // 3. Update the user document itself with lastLoginAt
    if (params.userId) {
      try {
        const userRef = doc(db, 'users', params.userId);
        await updateDoc(userRef, {
          lastLoginAt: nowIso,
          updatedAt: nowIso,
        });
      } catch {
        // Safe ignore if user doc cannot be modified
      }
    }
  }
}

/**
 * Retrieves all accounts and determines which have logged in at least once.
 * Compiles data from:
 * 1. Firestore 'accountLogins' collection
 * 2. Firestore 'users' collection (registered accounts)
 * 3. Default church list (129 churches across 24 groups)
 * 4. Soul submission activity in 'soulWinningRecords'
 */
export async function getAllAccountsWithLoginStatus(): Promise<{
  allAccounts: AccountLoginRecord[];
  loggedInAccounts: AccountLoginRecord[];
  neverLoggedInAccounts: AccountLoginRecord[];
  summary: AccountLoginSummary;
}> {
  const recordsMap = new Map<string, AccountLoginRecord>();

  // 1. Seed from Default Churches (129 official CEAZ1 churches)
  for (const church of DEFAULT_CHURCHES) {
    const group = DEFAULT_GROUPS.find((g) => g.id === church.groupId);
    const code = church.code.toUpperCase();
    recordsMap.set(code, {
      id: code,
      accountName: `${church.name} Representative`,
      email: churchCodeToAuthEmail(code),
      churchCode: code,
      churchName: church.name,
      churchId: church.id,
      groupName: group?.name || 'Abuja Zone 1',
      groupId: church.groupId,
      role: 'churchManager',
      hasLoggedIn: false,
      loginCount: 0,
    });
  }

  // 2. Seed from Default Groups (24 official CEAZ1 groups)
  for (const group of DEFAULT_GROUPS) {
    const groupId = `group-${group.id}`;
    recordsMap.set(groupId, {
      id: groupId,
      accountName: `${group.name} Coordinator`,
      email: `${group.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@ron.org`,
      groupName: group.name,
      groupId: group.id,
      role: 'groupManager',
      hasLoggedIn: false,
      loginCount: 0,
    });
  }

  // 3. Merge LocalStorage cached login records
  try {
    const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
    if (raw) {
      const cachedMap: Record<string, AccountLoginRecord> = JSON.parse(raw);
      for (const [key, item] of Object.entries(cachedMap)) {
        const normKey = key.toUpperCase();
        const existing = recordsMap.get(normKey);
        if (existing) {
          recordsMap.set(normKey, {
            ...existing,
            ...item,
            hasLoggedIn: true,
            loginCount: Math.max(existing.loginCount, item.loginCount || 1),
          });
        } else {
          recordsMap.set(normKey, {
            ...item,
            hasLoggedIn: true,
            loginCount: item.loginCount || 1,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[LoginTracker] Read local cache error:', err);
  }

  // 4. Merge Firestore 'accountLogins' collection
  if (navigator.onLine) {
    try {
      const snap = await getDocs(collection(db, 'accountLogins'));
      for (const d of snap.docs) {
        const data = d.data() as Partial<AccountLoginRecord>;
        const docKey = (data.churchCode || data.id || d.id).toUpperCase();
        const existing = recordsMap.get(docKey);

        if (existing) {
          recordsMap.set(docKey, {
            ...existing,
            ...data,
            hasLoggedIn: true,
            firstLoginAt: data.firstLoginAt || existing.firstLoginAt,
            lastLoginAt: data.lastLoginAt || existing.lastLoginAt,
            loginCount: Math.max(existing.loginCount, data.loginCount || 1),
          });
        } else {
          recordsMap.set(docKey, {
            id: d.id,
            accountName: data.accountName || d.id,
            email: data.email || '',
            role: data.role || 'soulWinner',
            churchCode: data.churchCode,
            churchName: data.churchName,
            groupName: data.groupName,
            hasLoggedIn: true,
            firstLoginAt: data.firstLoginAt,
            lastLoginAt: data.lastLoginAt,
            loginCount: data.loginCount || 1,
            lastDevice: data.lastDevice,
          });
        }
      }
    } catch (err) {
      console.warn('[LoginTracker] Read Firestore accountLogins error:', err);
    }

    // 5. Merge Firestore 'users' collection
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      for (const d of userSnap.docs) {
        const u = d.data() as UserProfile & { lastLoginAt?: string; loginCount?: number };
        const key = u.email ? u.email.toLowerCase() : u.id;
        
        // Find if user corresponds to any church code
        let matchedKey: string | undefined;
        for (const [recKey, rec] of recordsMap.entries()) {
          if (rec.email.toLowerCase() === u.email?.toLowerCase() || rec.userId === u.id) {
            matchedKey = recKey;
            break;
          }
        }

        if (matchedKey) {
          const existing = recordsMap.get(matchedKey)!;
          const userHasLoggedIn = !!u.lastLoginAt || (u.loginCount && u.loginCount > 0);
          recordsMap.set(matchedKey, {
            ...existing,
            userId: u.id,
            accountName: u.name || existing.accountName,
            role: u.role || existing.role,
            hasLoggedIn: Boolean(existing.hasLoggedIn || userHasLoggedIn),
            lastLoginAt: u.lastLoginAt || existing.lastLoginAt,
            loginCount: Math.max(existing.loginCount, u.loginCount || (userHasLoggedIn ? 1 : 0)),
          });
        } else {
          // Additional user (e.g. soul winner or admin)
          const userHasLoggedIn = !!u.lastLoginAt || (typeof u.loginCount === 'number' && u.loginCount > 0);
          recordsMap.set(key, {
            id: u.id,
            userId: u.id,
            accountName: u.name,
            email: u.email,
            role: u.role,
            hasLoggedIn: Boolean(userHasLoggedIn),
            lastLoginAt: u.lastLoginAt,
            loginCount: u.loginCount || (userHasLoggedIn ? 1 : 0),
          });
        }
      }
    } catch (err) {
      console.warn('[LoginTracker] Read Firestore users error:', err);
    }

    // 6. Check 'soulWinningRecords' collection for proof of activity
    try {
      const recordsSnap = await getDocs(collection(db, 'soulWinningRecords'));
      for (const d of recordsSnap.docs) {
        const rec = d.data();
        const churchId = rec.churchId;
        const churchCode = rec.churchCode?.toUpperCase();
        const recordedBy = rec.recordedBy || rec.userId;

        // Any church or account with submissions has logged in at least once!
        if (churchCode && recordsMap.has(churchCode)) {
          const item = recordsMap.get(churchCode)!;
          item.hasLoggedIn = true;
          item.loginCount = Math.max(item.loginCount, 1);
          item.soulsSubmitted = (item.soulsSubmitted || 0) + 1;
        } else if (churchId) {
          for (const item of recordsMap.values()) {
            if (item.churchId === churchId) {
              item.hasLoggedIn = true;
              item.loginCount = Math.max(item.loginCount, 1);
              item.soulsSubmitted = (item.soulsSubmitted || 0) + 1;
              break;
            }
          }
        }

        if (recordedBy) {
          for (const item of recordsMap.values()) {
            if (item.userId === recordedBy || item.id === recordedBy) {
              item.hasLoggedIn = true;
              item.loginCount = Math.max(item.loginCount, 1);
              item.soulsSubmitted = (item.soulsSubmitted || 0) + 1;
              break;
            }
          }
        }
      }
    } catch {
      // Ignore if cannot query records
    }
  }

  const allAccounts = Array.from(recordsMap.values());
  const loggedInAccounts = allAccounts.filter((a) => a.hasLoggedIn);
  const neverLoggedInAccounts = allAccounts.filter((a) => !a.hasLoggedIn);

  // Sort logged in accounts by lastLoginAt (descending)
  loggedInAccounts.sort((a, b) => {
    const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return timeB - timeA;
  });

  // Calculate metrics
  const totalChurches = allAccounts.filter((a) => a.role === 'churchManager').length;
  const churchLoggedIn = loggedInAccounts.filter((a) => a.role === 'churchManager').length;

  const totalGroups = allAccounts.filter((a) => a.role === 'groupManager').length;
  const groupLoggedIn = loggedInAccounts.filter((a) => a.role === 'groupManager').length;

  const totalAdmins = allAccounts.filter((a) => a.role === 'superAdmin' || a.role === 'zoneManager').length;
  const adminLoggedIn = loggedInAccounts.filter((a) => a.role === 'superAdmin' || a.role === 'zoneManager').length;

  const summary: AccountLoginSummary = {
    totalAccounts: allAccounts.length,
    loggedInCount: loggedInAccounts.length,
    neverLoggedInCount: neverLoggedInAccounts.length,
    percentageLoggedIn: allAccounts.length > 0 ? Math.round((loggedInAccounts.length / allAccounts.length) * 100) : 0,
    churchAccountsTotal: totalChurches,
    churchAccountsLoggedIn: churchLoggedIn,
    groupAccountsTotal: totalGroups,
    groupAccountsLoggedIn: groupLoggedIn,
    adminAccountsTotal: totalAdmins,
    adminAccountsLoggedIn: adminLoggedIn,
    lastActivityAt: loggedInAccounts[0]?.lastLoginAt,
  };

  return {
    allAccounts,
    loggedInAccounts,
    neverLoggedInAccounts,
    summary,
  };
}

/**
 * Exports logged-in accounts to CSV.
 */
export function exportLoggedInAccountsCSV(accounts: AccountLoginRecord[]): void {
  const headers = [
    'Account / Church Name',
    'Church Code',
    'Login Email',
    'Account Role',
    'Group Name',
    'First Login Date (WAT)',
    'Last Login Date (WAT)',
    'Total Logins',
    'Souls Submitted',
    'Status',
  ];

  const rows = accounts.map((acc) => [
    `"${(acc.churchName || acc.accountName).replace(/"/g, '""')}"`,
    `"${acc.churchCode || 'N/A'}"`,
    `"${acc.email}"`,
    `"${acc.role}"`,
    `"${(acc.groupName || 'Abuja Zone 1').replace(/"/g, '""')}"`,
    `"${acc.firstLoginAt ? new Date(acc.firstLoginAt).toLocaleString() : 'N/A'}"`,
    `"${acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString() : 'N/A'}"`,
    `"${acc.loginCount || 0}"`,
    `"${acc.soulsSubmitted || 0}"`,
    `"${acc.hasLoggedIn ? 'LOGGED IN' : 'PENDING'}"`,
  ]);

  const csvContent =
    '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  if (typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CEAZ1_Logged_In_Accounts_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
