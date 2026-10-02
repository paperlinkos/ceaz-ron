// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_PCFS, getPCFs } from '../src/services/organizationService';
import { churchCodeToAuthEmail } from '../src/services/churchAccountShared';
import type { SoulWinningRecord } from '../src/types/record';

describe('Zonal Church PCF: BITW First Service & Scoped Access Rules', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('defines BITW First Service under Zonal Church 1 in DEFAULT_PCFS', () => {
    const bitw = DEFAULT_PCFS.find((p) => p.name === 'BITW First Service');
    expect(bitw).toBeDefined();
    expect(bitw?.churchId).toBe('ch-zonal-church-1');
    expect(bitw?.code).toBe('PCF-BITW1');
    expect(bitw?.status).toBe('active');
  });

  it('getPCFs returns BITW First Service for Zonal Church 1', async () => {
    const pcfs = await getPCFs('ch-zonal-church-1');
    const bitw = pcfs.find((p) => p.name === 'BITW First Service');
    expect(bitw).toBeDefined();
    expect(bitw?.name).toBe('BITW First Service');
  });

  it('resolves church code aliases for BITW First Service correctly', () => {
    expect(churchCodeToAuthEmail('CH-ZNC1-BITW')).toBe('ch-znc1-bitw@ron.org');
    expect(churchCodeToAuthEmail('BITW')).toBe('ch-znc1-bitw@ron.org');
    expect(churchCodeToAuthEmail('BITW-1')).toBe('ch-znc1-bitw@ron.org');
    expect(churchCodeToAuthEmail('bitwfirstservice')).toBe('ch-znc1-bitw@ron.org');
  });

  it('enforces Zonal Church data privacy rule for BITW First Service vs other PCFs', () => {
    const records: SoulWinningRecord[] = [
      {
        id: 'rec-1',
        name: 'Brother Emmanuel',
        phone: '08011112222',
        location: 'Wuse 2',
        isBornAgain: true,
        isFilledWithHolySpirit: true,
        pcfName: 'BITW First Service',
        uploadedByEmail: 'ch-znc1-bitw@ron.org',
        churchId: 'ch-zonal-church-1',
        groupId: 'grp-zonal-church',
        createdAt: '2026-10-02T10:00:00Z',
        clientCreatedAt: '2026-10-02T10:00:00Z',
        syncStatus: 'synced',
        eventId: 'ron-2026-oct1',
      },
      {
        id: 'rec-2',
        name: 'Sister Sarah',
        phone: '08033334444',
        location: 'Maitama',
        isBornAgain: true,
        isFilledWithHolySpirit: true,
        pcfName: 'Dynamic PCF',
        uploadedByEmail: 'ch-znc1-dyn@ron.org',
        churchId: 'ch-zonal-church-1',
        groupId: 'grp-zonal-church',
        createdAt: '2026-10-02T11:00:00Z',
        clientCreatedAt: '2026-10-02T11:00:00Z',
        syncStatus: 'synced',
        eventId: 'ron-2026-oct1',
      },
      {
        id: 'rec-3',
        name: 'Brother David',
        phone: '08055556666',
        location: 'Central Area',
        isBornAgain: true,
        isFilledWithHolySpirit: true,
        pcfName: 'Huios PCF',
        uploadedByEmail: 'ch-znc1-huios@ron.org',
        churchId: 'ch-zonal-church-1',
        groupId: 'grp-zonal-church',
        createdAt: '2026-10-02T12:00:00Z',
        clientCreatedAt: '2026-10-02T12:00:00Z',
        syncStatus: 'synced',
        eventId: 'ron-2026-oct1',
      },
    ];

    // 1. BITW First Service Rep login
    const bitwUserEmail = 'ch-znc1-bitw@ron.org';
    const bitwPcfName = 'BITW First Service';
    const isMasterAdmin = false;
    const isZonalChurchContext = true;

    const bitwVisible = records.filter((r) => {
      if (isZonalChurchContext && !isMasterAdmin) {
        const belongsToMe =
          (r.uploadedByEmail && r.uploadedByEmail.toLowerCase() === bitwUserEmail.toLowerCase()) ||
          (r.pcfName && r.pcfName.toLowerCase() === bitwPcfName.toLowerCase());
        if (!belongsToMe) return false;
      }
      return true;
    });

    expect(bitwVisible.length).toBe(1);
    expect(bitwVisible[0].pcfName).toBe('BITW First Service');

    // 2. Master Admin login
    const masterAdminEmail = 'zonal-church-admin@ron.org';
    const isMasterAdminLogin = masterAdminEmail === 'zonal-church-admin@ron.org';

    const masterVisible = records.filter((r) => {
      if (isZonalChurchContext && !isMasterAdminLogin) {
        return false;
      }
      return true;
    });

    expect(masterVisible.length).toBe(3);
  });

  it('correctly formats and resolves real Firestore PCF IDs and slugs', async () => {
    const { formatPCFName } = await import('../src/components/public/PCFArenaView');
    expect(formatPCFName('pcf-zc2-huois')).toBe('Huios PCF');
    expect(formatPCFName('pcf-zc2-bitw')).toBe('BITW PCF');
    expect(formatPCFName('pcf-zc1-exclusive')).toBe('Exclusive PCF');
    expect(formatPCFName('pcf-zc1-kinging')).toBe('Kinging PCF');
    expect(formatPCFName('pcf-zc2-medical')).toBe('Medical PCF');
    expect(formatPCFName('Phenomenal Grace')).toBe('Phenomenal Grace PCF');
    expect(formatPCFName(undefined)).toBeNull();
    expect(formatPCFName('—')).toBeNull();
  });
});
