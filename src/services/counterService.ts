import { collection, onSnapshot, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { getAllLocalRecords, clearAllLocalRecords } from './indexedDbService';
import { subscribeToSyncStatus } from './syncService';
import { getGroups, getChurches } from './organizationService';
import { getTargets, subscribeToTargets } from './targetService';
import { calculateOrganizationProgress, calculateGroupRaceProgress, calculateChurchRaceProgress } from './targetProgressEngine';
import type { OrganizationProgress } from '../types/target';

export interface GroupRaceCompetitor {
  id: string;
  name: string;
  code: string;
  soulsWon: number;
  percentage: number;
  normalizedProgress: number;
  target: number;
  hasTarget: boolean;
  isTargetExceeded: boolean;
  displayPercentage: string;
  churches?: GroupRaceCompetitor[];
}

export interface ZonalCounterData {
  totalSoulsWon: number;
  zonalTarget: number;
  percentageAchieved: number;
  groupCompetitors: GroupRaceCompetitor[];
  groupProgresses: OrganizationProgress[];
  // Alias for backward compatibility
  nationalTarget: number;
  allRecords?: any[];
}

export type NationalCounterData = ZonalCounterData;

type CounterListener = (data: ZonalCounterData) => void;

/** Permanently purge all soul winning records from Firestore and clear local IndexedDB */
export async function purgeAllSoulWinningRecords(_actorId: string = 'superAdmin'): Promise<number> {
  let count = 0;
  try {
    const q = query(collection(db, 'soulWinningRecords'));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(doc(db, 'soulWinningRecords', d.id)));
    await Promise.all(deletePromises);
    count = snapshot.docs.length;
  } catch (err) {
    console.warn('Error purging Firestore soul winning records:', err);
  }

  try {
    await clearAllLocalRecords();
  } catch (err) {
    console.warn('Error clearing local IndexedDB soul records:', err);
  }

  return count;
}

/** Subscribes to realtime zonal soul count, targets, and group race aggregations */
export function subscribeToZonalCounter(
  zonalTarget: number,
  onUpdate: CounterListener
): () => void {
  let isMounted = true;
  let currentFirestoreDocs: any[] | undefined = undefined;
  let currentTargets = getTargets();

  const calculateAggregates = async () => {
    try {
      // 1. Fetch local records (always retained and counted immediately)
      const localRecords = await getAllLocalRecords();

      // Combine local records and Firestore records by unique ID
      const recordMap = new Map<string, any>();

      // Populate local records first for instant zero-latency UI updates
      localRecords.forEach((rec) => {
        recordMap.set(rec.id, rec);
      });

      // Eager fetch Firestore remote records if not yet populated
      if (!currentFirestoreDocs && navigator.onLine) {
        try {
          const snap = await getDocs(query(collection(db, 'soulWinningRecords')));
          if (snap && snap.docs.length > 0) {
            currentFirestoreDocs = snap.docs;
          }
        } catch (e) {
          console.warn('[counterService] eager getDocs error:', e);
        }
      }

      // Merge Firestore remote records (authoritative updates)
      if (currentFirestoreDocs) {
        currentFirestoreDocs.forEach((doc) => {
          const data = doc.data();
          const docId = data.id || doc.id;
          recordMap.set(docId, { ...(recordMap.get(docId) || {}), ...data });
        });
      }

      const allRecords = Array.from(recordMap.values());
      const totalSoulsWon = allRecords.length;

      // Determine Zonal Target (from custom target if configured, else default 50,000)
      const targetsList = await currentTargets;
      const zoneTargetObj = targetsList.find((t) => t.level === 'zone' && t.status === 'active' && t.target >= 50000);
      // Absolute floor: zonalTarget can NEVER be below 50,000
      const activeZoneTarget = Math.max(
        50000,
        zoneTargetObj ? zoneTargetObj.target : (zonalTarget >= 50000 ? zonalTarget : 50000)
      );

      const zoneProgress = calculateOrganizationProgress({
        organizationId: 'zone',
        organizationName: 'Reach Out Nigeria Zone',
        level: 'zone',
        actual: totalSoulsWon,
        target: activeZoneTarget,
      });

      // 2. Aggregate Group race progress using Target + Progress Engine
      const [groupsList, churchesList] = await Promise.all([getGroups(), getChurches()]);
      const groupProgresses = calculateGroupRaceProgress(allRecords, groupsList, targetsList, undefined, churchesList);

      const groupCompetitors: GroupRaceCompetitor[] = groupProgresses.map((p) => {
        const churchProgresses = calculateChurchRaceProgress(allRecords, churchesList, targetsList, p.organizationId);
        const churchCompetitors: GroupRaceCompetitor[] = churchProgresses.map((cp) => ({
          id: cp.organizationId,
          name: cp.organizationName,
          code: cp.organizationCode || cp.organizationName,
          soulsWon: cp.actual,
          percentage: cp.percentage,
          normalizedProgress: cp.normalizedProgress,
          target: cp.target,
          hasTarget: cp.hasTarget,
          isTargetExceeded: cp.isTargetExceeded,
          displayPercentage: cp.displayPercentage,
        }));

        return {
          id: p.organizationId,
          name: p.organizationName,
          code: p.organizationCode || p.organizationName,
          soulsWon: p.actual,
          percentage: p.percentage,
          normalizedProgress: p.normalizedProgress,
          target: p.target,
          hasTarget: p.hasTarget,
          isTargetExceeded: p.isTargetExceeded,
          displayPercentage: p.displayPercentage,
          churches: churchCompetitors,
        };
      });

      if (isMounted) {
        onUpdate({
          totalSoulsWon,
          zonalTarget: activeZoneTarget,
          nationalTarget: activeZoneTarget,
          percentageAchieved: zoneProgress.percentage,
          groupCompetitors,
          groupProgresses,
          allRecords,
        });
      }
    } catch (err) {
      console.warn('Error calculating zonal aggregates:', err);
    }
  };

  // Subscribe to local record & sync updates
  const unsubscribeSync = subscribeToSyncStatus(() => {
    calculateAggregates();
  });

  // Subscribe to in-window and cross-tab record changes
  const handleWindowRecordChange = () => {
    calculateAggregates();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('ron_record_change', handleWindowRecordChange);
    window.addEventListener('storage', handleWindowRecordChange);
  }

  // Subscribe to Targets realtime changes
  const unsubscribeTargets = subscribeToTargets((newTargets) => {
    currentTargets = Promise.resolve(newTargets);
    calculateAggregates();
  });

  // Initial calculation
  calculateAggregates();

  // Periodic polling fallback to guarantee counter freshness across all screens
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      getDocs(query(collection(db, 'soulWinningRecords')))
        .then((snap) => {
          if (snap && snap.docs.length > 0) {
            currentFirestoreDocs = snap.docs;
            calculateAggregates();
          }
        })
        .catch(() => {});
    }
  }, 10000);

  const handleWindowFocus = () => {
    if (navigator.onLine) {
      getDocs(query(collection(db, 'soulWinningRecords')))
        .then((snap) => {
          currentFirestoreDocs = snap.docs;
          calculateAggregates();
        })
        .catch(() => {});
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocus);
  }

  // Firestore Realtime Listener for Records
  if (navigator.onLine) {
    try {
      const q = query(collection(db, 'soulWinningRecords'));
      const unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          currentFirestoreDocs = snapshot.docs;
          calculateAggregates();
        },
        (error) => {
          console.warn('Realtime counter snapshot error:', error);
          calculateAggregates();
        }
      );

      return () => {
        isMounted = false;
        clearInterval(intervalId);
        unsubscribeSync();
        unsubscribeTargets();
        unsubscribeFirestore();
        if (typeof window !== 'undefined') {
          window.removeEventListener('ron_record_change', handleWindowRecordChange);
          window.removeEventListener('storage', handleWindowRecordChange);
          window.removeEventListener('focus', handleWindowFocus);
        }
      };
    } catch (err) {
      console.warn('Failed to attach Firestore snapshot listener:', err);
    }
  }

  return () => {
    isMounted = false;
    clearInterval(intervalId);
    unsubscribeSync();
    unsubscribeTargets();
    if (typeof window !== 'undefined') {
      window.removeEventListener('ron_record_change', handleWindowRecordChange);
      window.removeEventListener('storage', handleWindowRecordChange);
      window.removeEventListener('focus', handleWindowFocus);
    }
  };
}

export const subscribeToNationalCounter = subscribeToZonalCounter;
