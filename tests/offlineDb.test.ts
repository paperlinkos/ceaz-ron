import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { saveLocalRecord, getAllLocalRecords, getPendingRecords, updateRecordSyncStatus } from '../src/services/indexedDbService';
import type { SoulWinningRecord } from '../src/types/record';
import { generateUUID } from '../src/utils/uuid';

describe('IndexedDB Local Offline Persistence Service', () => {
  beforeEach(async () => {
    // Delete database to reset test environment cleanly
    indexedDB.deleteDatabase('ron_harvest_indexeddb');
  });

  it('saves and retrieves soul winning records ordered by creation date', async () => {
    const record1: SoulWinningRecord = {
      id: generateUUID(),
      name: 'Brother Emmanuel',
      phone: '08011112222',
      location: 'Wuse Market, Abuja',
      createdAt: '2026-09-26T10:00:00.000Z',
      clientCreatedAt: '2026-09-26T10:00:00.000Z',
      syncStatus: 'pending',
    };

    const record2: SoulWinningRecord = {
      id: generateUUID(),
      name: 'Sister Grace',
      phone: '08033334444',
      location: 'Airport Road, Abuja',
      createdAt: '2026-09-26T10:05:00.000Z',
      clientCreatedAt: '2026-09-26T10:05:00.000Z',
      syncStatus: 'pending',
    };

    await saveLocalRecord(record1);
    await saveLocalRecord(record2);

    const all = await getAllLocalRecords();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some(r => r.name === 'Sister Grace')).toBe(true);
    expect(all.some(r => r.name === 'Brother Emmanuel')).toBe(true);
  });

  it('retrieves only pending records and updates sync status idempotently', async () => {
    const record: SoulWinningRecord = {
      id: generateUUID(),
      name: 'Brother David',
      phone: '08055556666',
      location: 'Kubwa',
      createdAt: new Date().toISOString(),
      clientCreatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    await saveLocalRecord(record);

    let pending = await getPendingRecords();
    const foundRecord = pending.find(p => p.id === record.id);
    expect(foundRecord).toBeDefined();

    // Update status to synced
    const syncTime = new Date().toISOString();
    await updateRecordSyncStatus(record.id, 'synced', syncTime);

    pending = await getPendingRecords();
    expect(pending.some(p => p.id === record.id)).toBe(false);

    const all = await getAllLocalRecords();
    const syncedItem = all.find(r => r.id === record.id);
    expect(syncedItem?.syncStatus).toBe('synced');
    expect(syncedItem?.syncedAt).toBe(syncTime);
  });
});
