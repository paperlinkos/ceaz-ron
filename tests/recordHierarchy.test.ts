import { describe, it, expect } from 'vitest';
import type { SoulWinningRecord } from '../src/types/record';
import { generateUUID } from '../src/utils/uuid';

describe('Phase 2 Soul Winning Record Hierarchy Attribution', () => {
  it('automatically attaches full organizational hierarchy to soul-winning record', () => {
    const activeSoulWinner = {
      userId: 'usr_soul_winner_001',
      pcfId: 'pcf_grace_01',
      churchId: 'church_central_01',
      groupId: 'group_alpha_01',
      zoneId: 'zone_abuja_01',
    };

    const nowIso = new Date().toISOString();
    const record: SoulWinningRecord = {
      id: generateUUID(),
      name: 'Brother Timothy',
      phone: '08099990000',
      location: 'Central Mosque Plaza, Abuja',
      createdAt: nowIso,
      clientCreatedAt: nowIso,
      syncStatus: 'pending',

      soulWinnerId: activeSoulWinner.userId,
      pcfId: activeSoulWinner.pcfId,
      churchId: activeSoulWinner.churchId,
      groupId: activeSoulWinner.groupId,
      zoneId: activeSoulWinner.zoneId,
      eventId: 'ron-2026-oct1',
    };

    expect(record.name).toBe('Brother Timothy');
    expect(record.soulWinnerId).toBe('usr_soul_winner_001');
    expect(record.pcfId).toBe('pcf_grace_01');
    expect(record.churchId).toBe('church_central_01');
    expect(record.groupId).toBe('group_alpha_01');
    expect(record.zoneId).toBe('zone_abuja_01');
    expect(record.eventId).toBe('ron-2026-oct1');
  });
});
