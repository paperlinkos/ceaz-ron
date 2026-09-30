import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SoulWinningRecord, SyncStatus } from '../types/record';

interface RonHarvestDB extends DBSchema {
  soul_records: {
    key: string;
    value: SoulWinningRecord;
    indexes: {
      'by-syncStatus': SyncStatus;
      'by-clientCreatedAt': string;
    };
  };
}

const DB_NAME = 'ron_harvest_indexeddb';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RonHarvestDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RonHarvestDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RonHarvestDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('soul_records')) {
          const store = db.createObjectStore('soul_records', { keyPath: 'id' });
          store.createIndex('by-syncStatus', 'syncStatus');
          store.createIndex('by-clientCreatedAt', 'clientCreatedAt');
        }
      },
      blocked() {
        console.warn('[IndexedDB] Database open request is blocked.');
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then((db) => db.close()).catch(() => {});
          dbPromise = null;
        }
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** Save or overwrite a soul winning record in IndexedDB */
export async function saveLocalRecord(record: SoulWinningRecord): Promise<SoulWinningRecord> {
  try {
    const db = await getDB();
    await db.put('soul_records', record);
  } catch (err) {
    console.warn('Error saving local record to IndexedDB:', err);
  }
  return record;
}

/** Retrieve all local records ordered by clientCreatedAt descending */
export async function getAllLocalRecords(): Promise<SoulWinningRecord[]> {
  try {
    const timeoutPromise = new Promise<SoulWinningRecord[]>((resolve) =>
      setTimeout(() => resolve([]), 1500)
    );
    const fetchPromise = (async () => {
      const db = await getDB();
      const records = await db.getAllFromIndex('soul_records', 'by-clientCreatedAt');
      return records.reverse(); // Latest first
    })();
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Error reading records from IndexedDB:', err);
    return [];
  }
}

/** Retrieve only records that are waiting to be synced to Firebase */
export async function getPendingRecords(): Promise<SoulWinningRecord[]> {
  try {
    const timeoutPromise = new Promise<SoulWinningRecord[]>((resolve) =>
      setTimeout(() => resolve([]), 1500)
    );
    const fetchPromise = (async () => {
      const db = await getDB();
      return db.getAllFromIndex('soul_records', 'by-syncStatus', 'pending');
    })();
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Error reading pending records from IndexedDB:', err);
    return [];
  }
}

/** Update sync status for a record in IndexedDB */
export async function updateRecordSyncStatus(
  id: string,
  syncStatus: SyncStatus,
  syncedAt?: string,
  syncError?: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('soul_records', 'readwrite');
  const store = tx.objectStore('soul_records');
  const record = await store.get(id);

  if (record) {
    record.syncStatus = syncStatus;
    if (syncedAt) record.syncedAt = syncedAt;
    if (syncError !== undefined) record.syncError = syncError;
    await store.put(record);
  }
  await tx.done;
}

/** Get a single record by ID */
export async function getLocalRecordById(id: string): Promise<SoulWinningRecord | undefined> {
  const db = await getDB();
  return db.get('soul_records', id);
}

/** Delete a single local record by ID */
export async function deleteLocalRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('soul_records', id);
}

/** Clear all records from IndexedDB */
export async function clearAllLocalRecords(): Promise<void> {
  const db = await getDB();
  await db.clear('soul_records');
}
