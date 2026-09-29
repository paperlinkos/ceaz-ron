import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { getAllLocalRecords, deleteLocalRecord, saveLocalRecord } from './indexedDbService';
import type { SoulWinningRecord } from '../types/record';

export type DuplicateMatchType = 'exact_phone' | 'exact_name' | 'first_name_location';
export type DuplicateConfidence = 'high' | 'medium';

export interface DuplicateGroup {
  id: string; // Group ID (e.g., dup-group-phone-12345)
  matchType: DuplicateMatchType;
  confidence: DuplicateConfidence;
  matchReason: string;
  primaryRecord: SoulWinningRecord;
  duplicateRecords: SoulWinningRecord[];
}

export interface DuplicateResolutionReport {
  totalRecordsScanned: number;
  totalFlaggedCount: number;
  duplicateGroups: DuplicateGroup[];
  isHealthy: boolean;
}

// Set of record IDs that the admin has explicitly marked as unique
const RESOLVED_UNIQUE_PAIR_IDS_KEY = 'ron_resolved_unique_pairs';

function getResolvedUniquePairs(): Set<string> {
  try {
    const raw = localStorage.getItem(RESOLVED_UNIQUE_PAIR_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveResolvedUniquePairs(set: Set<string>): void {
  try {
    localStorage.setItem(RESOLVED_UNIQUE_PAIR_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error('Failed to save resolved unique pairs:', err);
  }
}

/**
 * Loads resolved unique pairs from Firestore and merges with local cache.
 * Falls back to localStorage if offline or Firebase is not configured.
 */
async function loadResolvedUniquePairsFromFirestore(): Promise<Set<string>> {
  const localSet = getResolvedUniquePairs();
  if (!navigator.onLine || !isFirebaseConfigured) return localSet;

  try {
    const snap = await getDocs(collection(db, 'adminDuplicateResolutions'));
    snap.forEach((d) => localSet.add(d.data().pairKey as string));
    // Sync back to localStorage as a cache
    saveResolvedUniquePairs(localSet);
  } catch (err) {
    console.warn('[DuplicateDetection] Failed to load resolved pairs from Firestore:', err);
  }
  return localSet;
}

/**
 * Persists a resolved pair key to Firestore so it survives browser cache clears.
 */
async function savePairToFirestore(pairKey: string): Promise<void> {
  if (!navigator.onLine || !isFirebaseConfigured) return;
  try {
    // Encode the pair key to make it a safe Firestore document ID
    const safeId = pairKey.replace(/:/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    await setDoc(doc(db, 'adminDuplicateResolutions', safeId), {
      pairKey,
      resolvedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[DuplicateDetection] Failed to persist resolved pair to Firestore:', err);
  }
}

/** Normalize phone number by removing country codes (+234, 234), spaces, and non-digits */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length > 10) {
    digits = '0' + digits.slice(3);
  }
  return digits;
}

/** Clean and extract normalized first name from string */
export function extractFirstName(name: string): string {
  if (!name) return '';
  // Remove common titles like Bro, Brother, Sis, Sister, Deacon, Pastor
  const cleaned = name
    .replace(/\b(brother|bro|sister|sis|deacon|deaconess|pastor|pst|mr|mrs|miss|dr)\b/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[0].toLowerCase() : name.trim().toLowerCase();
}

/** Detect duplicate soul winning records across phone numbers and first name + location */
export async function detectDuplicateSouls(): Promise<DuplicateResolutionReport> {
  const allRecords = await getAllLocalRecords();
  // Load from Firestore for cross-session persistence, fall back to localStorage
  const resolvedPairs = await loadResolvedUniquePairsFromFirestore();

  const flaggedGroupMap = new Map<string, DuplicateGroup>();
  const processedPairKeys = new Set<string>();

  // 1. Phone Indexing (Normalized)
  const phoneIndex = new Map<string, SoulWinningRecord[]>();
  // 2. Full Name Indexing
  const fullNameIndex = new Map<string, SoulWinningRecord[]>();
  // 3. First Name + Location / Church Indexing
  const firstNameLocationIndex = new Map<string, SoulWinningRecord[]>();

  allRecords.forEach((rec) => {
    // Phone
    const normPhone = normalizePhone(rec.phone);
    if (normPhone.length >= 7) {
      const existing = phoneIndex.get(normPhone) || [];
      existing.push(rec);
      phoneIndex.set(normPhone, existing);
    }

    // Full Name
    const normFullName = rec.name.trim().toLowerCase();
    if (normFullName.length > 2) {
      const existing = fullNameIndex.get(normFullName) || [];
      existing.push(rec);
      fullNameIndex.set(normFullName, existing);
    }

    // First Name + Location or Church
    const firstName = extractFirstName(rec.name);
    const locKey = (rec.location || rec.churchName || '').trim().toLowerCase();
    if (firstName.length >= 3 && locKey.length >= 2) {
      const comboKey = `${firstName}::${locKey}`;
      const existing = firstNameLocationIndex.get(comboKey) || [];
      existing.push(rec);
      firstNameLocationIndex.set(comboKey, existing);
    }
  });

  // Check Phone Duplicates (HIGH CONFIDENCE)
  phoneIndex.forEach((records, normPhone) => {
    if (records.length > 1) {
      const primary = records[0];
      const dups = records.slice(1);

      // Check if pair was already marked unique
      const unflaggedDups = dups.filter((d) => {
        const pairKey = [primary.id, d.id].sort().join('::');
        return !resolvedPairs.has(pairKey);
      });

      if (unflaggedDups.length > 0) {
        const groupId = `dup-phone-${normPhone}`;
        flaggedGroupMap.set(groupId, {
          id: groupId,
          matchType: 'exact_phone',
          confidence: 'high',
          matchReason: `Matching Phone Number (${primary.phone})`,
          primaryRecord: primary,
          duplicateRecords: unflaggedDups,
        });

        unflaggedDups.forEach((d) => {
          processedPairKeys.add([primary.id, d.id].sort().join('::'));
        });
      }
    }
  });

  // Check Exact Full Name Duplicates (HIGH CONFIDENCE)
  fullNameIndex.forEach((records, normName) => {
    if (records.length > 1) {
      const primary = records[0];
      const dups = records.slice(1).filter((d) => {
        const pairKey = [primary.id, d.id].sort().join('::');
        return !processedPairKeys.has(pairKey) && !resolvedPairs.has(pairKey);
      });

      if (dups.length > 0) {
        const groupId = `dup-name-${normName.replace(/\s+/g, '_')}`;
        flaggedGroupMap.set(groupId, {
          id: groupId,
          matchType: 'exact_name',
          confidence: 'high',
          matchReason: `Matching Full Name ("${primary.name}")`,
          primaryRecord: primary,
          duplicateRecords: dups,
        });

        dups.forEach((d) => {
          processedPairKeys.add([primary.id, d.id].sort().join('::'));
        });
      }
    }
  });

  // Check First Name + Location Duplicates (MEDIUM CONFIDENCE)
  firstNameLocationIndex.forEach((records, comboKey) => {
    if (records.length > 1) {
      const primary = records[0];
      const dups = records.slice(1).filter((d) => {
        const pairKey = [primary.id, d.id].sort().join('::');
        return !processedPairKeys.has(pairKey) && !resolvedPairs.has(pairKey);
      });

      if (dups.length > 0) {
        const [firstName, locName] = comboKey.split('::');
        const groupId = `dup-first-loc-${comboKey.replace(/\s+/g, '_')}`;
        flaggedGroupMap.set(groupId, {
          id: groupId,
          matchType: 'first_name_location',
          confidence: 'medium',
          matchReason: `Same First Name ("${firstName}") & Same Location/Church ("${locName}")`,
          primaryRecord: primary,
          duplicateRecords: dups,
        });
      }
    }
  });

  const duplicateGroups = Array.from(flaggedGroupMap.values());
  let totalFlaggedCount = 0;
  duplicateGroups.forEach((g) => {
    totalFlaggedCount += 1 + g.duplicateRecords.length;
  });

  return {
    totalRecordsScanned: allRecords.length,
    totalFlaggedCount,
    duplicateGroups,
    isHealthy: duplicateGroups.length === 0,
  };
}

/** Check if a single candidate record matches existing records in real-time */
export async function checkSingleRecordDuplicate(
  name: string,
  phone: string,
  location: string
): Promise<{ isDuplicate: boolean; matchReason?: string; existingRecord?: SoulWinningRecord }> {
  if (!name && !phone) return { isDuplicate: false };

  const allRecords = await getAllLocalRecords();
  const normPhone = normalizePhone(phone);
  const inputFirstName = extractFirstName(name);

  for (const rec of allRecords) {
    // 1. Phone match
    if (normPhone && normPhone.length >= 7 && normalizePhone(rec.phone) === normPhone) {
      return {
        isDuplicate: true,
        matchReason: `Exact Phone Number match with "${rec.name}" (${rec.phone})`,
        existingRecord: rec,
      };
    }

    // 2. Full Name match
    if (name.trim().length > 2 && rec.name.trim().toLowerCase() === name.trim().toLowerCase()) {
      return {
        isDuplicate: true,
        matchReason: `Exact Full Name match with recorded soul "${rec.name}"`,
        existingRecord: rec,
      };
    }

    // 3. First Name + Location match
    if (
      inputFirstName.length >= 3 &&
      extractFirstName(rec.name) === inputFirstName &&
      location.trim().length >= 3 &&
      rec.location.toLowerCase().includes(location.trim().toLowerCase())
    ) {
      return {
        isDuplicate: true,
        matchReason: `Same First Name ("${inputFirstName}") and Location ("${location}")`,
        existingRecord: rec,
      };
    }
  }

  return { isDuplicate: false };
}

/** Resolve duplicate group by deleting redundant duplicate records */
export async function resolveDeleteDuplicates(duplicateRecordIds: string[]): Promise<void> {
  for (const dupId of duplicateRecordIds) {
    await deleteLocalRecord(dupId);
  }
}

/** Merge duplicate record details into primary record and delete duplicate */
export async function resolveMergeRecords(primaryRecord: SoulWinningRecord, duplicateRecord: SoulWinningRecord): Promise<void> {
  const mergedNotes = [primaryRecord.notes, duplicateRecord.notes ? `[Merged Note]: ${duplicateRecord.notes}` : null]
    .filter(Boolean)
    .join('\n');

  const updatedPrimary: SoulWinningRecord = {
    ...primaryRecord,
    isBornAgain: primaryRecord.isBornAgain || duplicateRecord.isBornAgain,
    isFilledWithHolySpirit: primaryRecord.isFilledWithHolySpirit || duplicateRecord.isFilledWithHolySpirit,
    notes: mergedNotes || undefined,
  };

  await saveLocalRecord(updatedPrimary);
  await deleteLocalRecord(duplicateRecord.id);
}

/**
 * Mark record pair as confirmed unique individuals.
 * Persists to both localStorage (for offline use) and Firestore (for cross-device persistence).
 */
export async function resolveMarkAsUnique(recId1: string, recId2: string): Promise<void> {
  const resolvedSet = getResolvedUniquePairs();
  const pairKey = [recId1, recId2].sort().join('::');
  resolvedSet.add(pairKey);
  saveResolvedUniquePairs(resolvedSet);
  // Also persist to Firestore so resolution survives browser cache clears
  await savePairToFirestore(pairKey);
}
