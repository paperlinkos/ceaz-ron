// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn(), docs: [] }),
    increment: vi.fn((n) => n),
  };
});

import {
  recordAccountLogin,
  getAllAccountsWithLoginStatus,
  exportLoggedInAccountsCSV,
} from '../src/services/loginTrackerService';

describe('Account Login Tracker Engine (Super Admin Only)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('records an account login and updates cache with login count', async () => {
    await recordAccountLogin({
      userId: 'test-user-1',
      name: 'Central Church Rep',
      email: 'ch-central@ron.org',
      churchCode: 'CH-CENTRAL',
      role: 'churchManager',
      groupName: 'Abuja Central Group',
    });

    const result = await getAllAccountsWithLoginStatus();
    expect(result.loggedInAccounts.length).toBeGreaterThan(0);

    const loggedIn = result.loggedInAccounts.find((a) => a.churchCode === 'CH-CENTRAL');
    expect(loggedIn).toBeDefined();
    expect(loggedIn?.hasLoggedIn).toBe(true);
    expect(loggedIn?.loginCount).toBe(1);
    expect(loggedIn?.lastLoginAt).toBeDefined();
  });

  it('correctly increments loginCount upon repeated sign-ins', async () => {
    await recordAccountLogin({
      userId: 'test-user-2',
      name: 'Gwarinpa 1 Rep',
      email: 'ch-gwarinpa1@ron.org',
      churchCode: 'CH-GWARINPA1',
      role: 'churchManager',
    });

    await recordAccountLogin({
      userId: 'test-user-2',
      name: 'Gwarinpa 1 Rep',
      email: 'ch-gwarinpa1@ron.org',
      churchCode: 'CH-GWARINPA1',
      role: 'churchManager',
    });

    const result = await getAllAccountsWithLoginStatus();
    const gwarinpa = result.loggedInAccounts.find((a) => a.churchCode === 'CH-GWARINPA1');
    expect(gwarinpa).toBeDefined();
    expect(gwarinpa?.loginCount).toBe(2);
  });

  it('distinguishes between logged-in accounts and pending first login accounts', async () => {
    await recordAccountLogin({
      userId: 'admin-1',
      name: 'Zonal Super Admin',
      email: 'admin@ron.org',
      role: 'superAdmin',
    });

    const result = await getAllAccountsWithLoginStatus();

    expect(result.summary.loggedInCount).toBeGreaterThanOrEqual(1);
    expect(result.summary.neverLoggedInCount).toBeGreaterThan(0);
    expect(result.summary.totalAccounts).toBe(
      result.summary.loggedInCount + result.summary.neverLoggedInCount
    );
  });

  it('generates a CSV download for logged in accounts without throwing', async () => {
    // Mock document.createElement and appendChild
    const mockClick = vi.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    window.URL.revokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

    exportLoggedInAccountsCSV([
      {
        id: 'CH-KBS',
        accountName: 'Kubwa Subgroup 1 Church',
        email: 'ch-kbs@ron.org',
        churchCode: 'CH-KBS',
        role: 'churchManager',
        groupName: 'Kubwa Group',
        hasLoggedIn: true,
        loginCount: 3,
        firstLoginAt: '2026-10-01T06:00:00Z',
        lastLoginAt: '2026-10-01T06:30:00Z',
      },
    ]);

    expect(mockClick).toHaveBeenCalled();
  });
});
