import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { getPendingRecords, updateRecordSyncStatus, getAllLocalRecords } from './indexedDbService';
import type { SoulWinningRecord } from '../types/record';

type SyncListener = (status: {
  isSyncing: boolean;
  lastSyncedCount: number;
  error?: string;
  updatedRecords: SoulWinningRecord[];
}) => void;

const listeners: Set<SyncListener> = new Set();
let isSyncingActive = false;

let syncBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncBroadcastChannel = new BroadcastChannel('ron_sync_channel');
    syncBroadcastChannel.onmessage = async (event) => {
      if (event.data?.type === 'RON_RECORD_CHANGED') {
        const updatedRecords = await getAllLocalRecords();
        listeners.forEach((listener) => {
          listener({
            isSyncing: isSyncActive(),
            lastSyncedCount: 0,
            updatedRecords,
          });
        });
      }
    };
  }
} catch {
  // BroadcastChannel unavailable
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function notifyListeners(lastSyncedCount = 0, error?: string) {
  const updatedRecords = await getAllLocalRecords();
  listeners.forEach((listener) => {
    listener({
      isSyncing: isSyncActive(),
      lastSyncedCount,
      error,
      updatedRecords,
    });
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ron_record_change'));
  }
}

export async function notifyRecordChanges(lastSyncedCount = 0, error?: string) {
  await notifyListeners(lastSyncedCount, error);
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'RON_RECORD_CHANGED' });
    } catch {
      // ignore
    }
  }
}

export function isSyncActive(): boolean {
  return isSyncingActive;
}

/**
 * Idempotently sync pending local records with Cloud Firestore.
 * Uses client-generated record.id as the document ID in Firestore to prevent duplicates.
 */
export async function syncPendingRecords(): Promise<{ syncedCount: number; totalPending: number }> {
  if (isSyncingActive) {
    return { syncedCount: 0, totalPending: 0 };
  }

  if (!navigator.onLine) {
    console.log('[SyncService] Offline - skipping synchronization.');
    return { syncedCount: 0, totalPending: 0 };
  }

  const pending = await getPendingRecords();
  if (pending.length === 0) {
    return { syncedCount: 0, totalPending: 0 };
  }

  // Prevent record writes to Firestore before the official countdown launch at 9:00 AM WAT
  const launchTimestamp = new Date('2026-10-01T09:00:00+01:00').getTime();
  if (Date.now() < launchTimestamp) {
    console.log('[SyncService] Campaign countdown active. Holding synchronization until official launch at 9:00 AM WAT.');
    return { syncedCount: 0, totalPending: pending.length };
  }

  isSyncingActive = true;
  await notifyListeners();

  let syncedCount = 0;

  try {
    for (const record of pending) {
      const nowIso = new Date().toISOString();

      if (!isFirebaseConfigured) {
        console.warn('[SyncService] Firebase config missing. Marking record as synced locally for dev/demo mode.');
        await updateRecordSyncStatus(record.id, 'synced', nowIso);
        syncedCount++;
        continue;
      }

      try {
        const docData = {
          id: record.id,
          name: record.name,
          phone: record.phone,
          location: record.location,
          isBornAgain: record.isBornAgain ?? true,
          isFilledWithHolySpirit: record.isFilledWithHolySpirit ?? true,
          notes: record.notes || '',
          createdAt: record.createdAt,
          clientCreatedAt: record.clientCreatedAt,
          syncStatus: 'synced',
          syncedAt: nowIso,
          serverTimestamp: serverTimestamp(),
          ...(record.soulWinnerId ? { soulWinnerId: record.soulWinnerId } : {}),
          ...(record.pcfId ? { pcfId: record.pcfId } : {}),
          ...(record.churchId ? { churchId: record.churchId } : {}),
          ...(record.churchName ? { churchName: record.churchName } : {}),
          ...(record.groupId ? { groupId: record.groupId } : {}),
          ...(record.groupName ? { groupName: record.groupName } : {}),
          ...(record.zoneId ? { zoneId: record.zoneId } : {}),
          ...(record.zoneName ? { zoneName: record.zoneName } : {}),
          ...(record.eventId ? { eventId: record.eventId } : {}),
        };

        const docRef = doc(db, 'soulWinningRecords', record.id);
        await setDoc(docRef, docData, { merge: true });

        await updateRecordSyncStatus(record.id, 'synced', nowIso);
        syncedCount++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[SyncService] Failed to sync record ${record.id}:`, errorMsg);
        await updateRecordSyncStatus(record.id, 'pending', undefined, errorMsg);
      }
    }
  } finally {
    isSyncingActive = false;
    await notifyListeners(syncedCount);
  }

  return { syncedCount, totalPending: pending.length };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncService] Online event detected. Triggering auto-sync...');
    syncPendingRecords();
  });
}
