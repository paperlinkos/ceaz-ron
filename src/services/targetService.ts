import { collection, doc, getDocs, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { REACH_OUT_NIGERIA_EVENT } from '../config/eventConfig';
import type { Target, TargetFormData } from '../types/target';
import { writeAdminAuditLog } from './userService';

const TARGETS_COLLECTION = 'targets';

/** Fetches all active targets, guaranteeing that all official PDF targets are seeded if not customized */
export async function getTargets(): Promise<Target[]> {
  try {
    if (!navigator.onLine) {
      return getCachedLocalTargets();
    }
    const q = query(collection(db, TARGETS_COLLECTION), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    const customTargets: Target[] = [];
    snapshot.forEach((d) => {
      customTargets.push({ id: d.id, ...d.data() } as Target);
    });
    const merged = mergeTargetsWithDefaults(customTargets);
    setCachedLocalTargets(merged);
    return merged;
  } catch (err) {
    console.warn('Error fetching targets from Firestore:', err);
    return getCachedLocalTargets();
  }
}

/** Saves or updates an organization target */
export async function saveTarget(
  formData: TargetFormData,
  userId: string
): Promise<Target> {
  if (formData.target <= 0 || isNaN(formData.target)) {
    throw new Error('Target must be a positive number greater than zero.');
  }

  const targetId = `${REACH_OUT_NIGERIA_EVENT.id}_${formData.level}_${formData.organizationId}`;
  const now = new Date().toISOString();

  const targetData: Target = {
    id: targetId,
    eventId: REACH_OUT_NIGERIA_EVENT.id,
    level: formData.level,
    organizationId: formData.organizationId,
    target: Math.round(formData.target),
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    status: 'active',
  };

  if (navigator.onLine) {
    try {
      const docRef = doc(db, TARGETS_COLLECTION, targetId);
      await setDoc(docRef, targetData, { merge: true });
    } catch (err) {
      console.warn('Error saving target to Firestore:', err);
    }
  }

  // Update local cache
  const local = getCachedLocalTargets();
  const idx = local.findIndex((t) => t.id === targetId);
  if (idx >= 0) {
    local[idx] = targetData;
  } else {
    local.push(targetData);
  }
  setCachedLocalTargets(local);

  return targetData;
}

/** Saves or updates multiple organization targets in batch */
export async function saveMultipleTargets(
  targetsList: TargetFormData[],
  userId: string
): Promise<Target[]> {
  const now = new Date().toISOString();
  const savedTargets: Target[] = [];
  const local = getCachedLocalTargets();

  for (const item of targetsList) {
    if (item.target <= 0 || isNaN(item.target)) continue;

    const targetId = `${REACH_OUT_NIGERIA_EVENT.id}_${item.level}_${item.organizationId}`;
    const targetData: Target = {
      id: targetId,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      level: item.level,
      organizationId: item.organizationId,
      target: Math.round(item.target),
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      status: 'active',
    };

    savedTargets.push(targetData);

    const idx = local.findIndex((t) => t.id === targetId);
    if (idx >= 0) {
      local[idx] = targetData;
    } else {
      local.push(targetData);
    }
  }

  // Update local cache
  setCachedLocalTargets(local);

  // Sync to Firestore if online
  if (navigator.onLine) {
    try {
      const promises = savedTargets.map((td) => {
        const docRef = doc(db, TARGETS_COLLECTION, td.id);
        return setDoc(docRef, td, { merge: true });
      });
      await Promise.all(promises);
    } catch (err) {
      console.warn('Error saving batch targets to Firestore:', err);
    }
  }

  return savedTargets;
}

/** Subscribes to realtime updates on targets */
export function subscribeToTargets(onUpdate: (targets: Target[]) => void): () => void {
  if (!navigator.onLine) {
    onUpdate(getCachedLocalTargets());
    return () => {};
  }

  try {
    const q = query(collection(db, TARGETS_COLLECTION), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const customTargets: Target[] = [];
        snapshot.forEach((d) => {
          customTargets.push({ id: d.id, ...d.data() } as Target);
        });
        const merged = mergeTargetsWithDefaults(customTargets);
        setCachedLocalTargets(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn('Target subscription error:', err);
        onUpdate(getCachedLocalTargets());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to targets:', err);
    onUpdate(getCachedLocalTargets());
    return () => {};
  }
}

// Local cache helpers for offline resiliency
const LOCAL_TARGETS_KEY = 'ron_cached_targets';

export function getCachedLocalTargets(): Target[] {
  try {
    const data = localStorage.getItem(LOCAL_TARGETS_KEY);
    if (!data) return getDefaultInitialTargets();
    const parsed: Target[] = JSON.parse(data);
    const cleaned = parsed.filter((t) => !(t.level === 'zone' && t.target === 40000));
    return mergeTargetsWithDefaults(cleaned);
  } catch {
    return getDefaultInitialTargets();
  }
}

export function setCachedLocalTargets(targets: Target[]): void {
  try {
    localStorage.setItem(LOCAL_TARGETS_KEY, JSON.stringify(targets));
  } catch (err) {
    console.warn('Failed to cache targets in localStorage:', err);
  }
}

/**
 * Official Targets exactly extracted from the user's PDF document.
 * These reflect the exact individual targets for each Group and Church.
 */
export const OFFICIAL_TARGET_MAP: { orgId: string; level: 'zone' | 'group' | 'church'; target: number }[] = [
  { orgId: 'zone-abuja-1', level: 'zone', target: 50000 },
  { orgId: 'default_zone', level: 'zone', target: 50000 },

  // Groups (24 Groups)
  { orgId: 'grp-zonal-church', level: 'group', target: 10000 },
  { orgId: 'grp-strategic-zonal', level: 'group', target: 2500 },
  { orgId: 'grp-heavenly-phantheon', level: 'group', target: 2000 },
  { orgId: 'grp-dawaki', level: 'group', target: 1000 },
  { orgId: 'grp-wuye-1', level: 'group', target: 1000 },
  { orgId: 'grp-wuye-2', level: 'group', target: 1000 },
  { orgId: 'grp-karmo', level: 'group', target: 1000 },
  { orgId: 'grp-gwarinpa', level: 'group', target: 2500 },
  { orgId: 'grp-fruitful-vine', level: 'group', target: 1000 },
  { orgId: 'grp-kubwa-1', level: 'group', target: 3500 },
  { orgId: 'grp-kubwa-2', level: 'group', target: 1000 },
  { orgId: 'grp-bwari', level: 'group', target: 2500 },
  { orgId: 'grp-new-horizon', level: 'group', target: 2000 },
  { orgId: 'grp-gwagwalada-1', level: 'group', target: 2000 },
  { orgId: 'grp-gwagwalada-2', level: 'group', target: 2000 },
  { orgId: 'grp-kuje', level: 'group', target: 2000 },
  { orgId: 'grp-lokogoma', level: 'group', target: 2500 },
  { orgId: 'grp-dei-dei', level: 'group', target: 2000 },
  { orgId: 'grp-airport-road', level: 'group', target: 2500 },
  { orgId: 'grp-byazhin', level: 'group', target: 1000 },
  { orgId: 'grp-dutse-makaranta', level: 'group', target: 1000 },
  { orgId: 'grp-wealthy-place', level: 'group', target: 1000 },
  { orgId: 'grp-city-church', level: 'group', target: 1500 },
  { orgId: 'grp-teens-church', level: 'group', target: 1500 },

  // Churches (129 Churches)
  // Zonal Church Group
  { orgId: 'ch-zonal-church-1', level: 'church', target: 2000 },
  { orgId: 'ch-zonal-church-2', level: 'church', target: 2000 },
  { orgId: 'ch-lingual-church', level: 'church', target: 1500 },
  { orgId: 'ch-ce-city-church-zonal', level: 'church', target: 1500 },
  { orgId: 'ch-service-1', level: 'church', target: 1500 },
  { orgId: 'ch-service-2', level: 'church', target: 1500 },

  // Strategic Group Zonal
  { orgId: 'ch-ce-tasha-2', level: 'church', target: 350 },
  { orgId: 'ch-ce-fullness', level: 'church', target: 150 },
  { orgId: 'ch-ce-strategic-gudu', level: 'church', target: 300 },
  { orgId: 'ch-ce-kuduru', level: 'church', target: 100 },
  { orgId: 'ch-ce-dawaki-3', level: 'church', target: 100 },
  { orgId: 'ch-ce-life-camp', level: 'church', target: 150 },
  { orgId: 'ch-ce-asokoro', level: 'church', target: 150 },
  { orgId: 'ch-ce-kagini-3', level: 'church', target: 100 },
  { orgId: 'ch-ce-giri', level: 'church', target: 150 },
  { orgId: 'ch-ce-dei-dei-3', level: 'church', target: 150 },
  { orgId: 'ch-ce-paipe', level: 'church', target: 100 },
  { orgId: 'ch-ce-cbd-2', level: 'church', target: 150 },
  { orgId: 'ch-ce-kubwa-2', level: 'church', target: 400 },
  { orgId: 'ch-ce-kado', level: 'church', target: 150 },

  // Heavenly Phantheon Group
  { orgId: 'ch-ce-model-church', level: 'church', target: 1350 },
  { orgId: 'ch-ce-utako', level: 'church', target: 110 },
  { orgId: 'ch-ce-excel', level: 'church', target: 130 },
  { orgId: 'ch-ce-obansajo', level: 'church', target: 50 },
  { orgId: 'ch-ce-rabah-apo', level: 'church', target: 100 },
  { orgId: 'ch-ce-jiwa-3', level: 'church', target: 50 },
  { orgId: 'ch-ce-saburi', level: 'church', target: 50 },
  { orgId: 'ch-ce-utako-2', level: 'church', target: 80 },
  { orgId: 'ch-ce-kingship-centre', level: 'church', target: 80 },

  // Dawaki Sub-Group
  { orgId: 'ch-ce-dawaki', level: 'church', target: 550 },
  { orgId: 'ch-ce-dawaki-2', level: 'church', target: 150 },
  { orgId: 'ch-ce-dawaki-5', level: 'church', target: 150 },
  { orgId: 'ch-ce-wisdom-mopol', level: 'church', target: 150 },

  // Wuye Sub-Group 1
  { orgId: 'ch-ce-kbs', level: 'church', target: 400 },
  { orgId: 'ch-ce-lighthouse', level: 'church', target: 280 },
  { orgId: 'ch-ce-koinonia', level: 'church', target: 260 },
  { orgId: 'ch-ce-kbs-2', level: 'church', target: 30 },
  { orgId: 'ch-ce-kbs-3', level: 'church', target: 30 },

  // Wuye Sub-Group 2
  { orgId: 'ch-ce-express', level: 'church', target: 530 },
  { orgId: 'ch-ce-livingspring', level: 'church', target: 240 },
  { orgId: 'ch-ce-pacesetters', level: 'church', target: 230 },

  // Karmo Group
  { orgId: 'ch-ce-karmo', level: 'church', target: 700 },
  { orgId: 'ch-ce-dape', level: 'church', target: 100 },
  { orgId: 'ch-ce-karmo-2', level: 'church', target: 100 },
  { orgId: 'ch-ce-kagini', level: 'church', target: 100 },

  // Gwarinpa Group
  { orgId: 'ch-ce-gwarinpa-1', level: 'church', target: 1500 },
  { orgId: 'ch-ce-precious-place', level: 'church', target: 350 },
  { orgId: 'ch-ce-word-arena', level: 'church', target: 150 },
  { orgId: 'ch-ce-kagini-2', level: 'church', target: 150 },
  { orgId: 'ch-ce-flourish', level: 'church', target: 150 },
  { orgId: 'ch-ce-karsana', level: 'church', target: 200 },

  // Fruitful Vine Sub-Group
  { orgId: 'ch-ce-solution-arena', level: 'church', target: 400 },
  { orgId: 'ch-ce-jahi', level: 'church', target: 300 },
  { orgId: 'ch-ce-kado-2', level: 'church', target: 300 },

  // Kubwa 1 Group
  { orgId: 'ch-ce-kubwa', level: 'church', target: 2000 },
  { orgId: 'ch-ce-katampe-ext', level: 'church', target: 500 },
  { orgId: 'ch-ce-kubwa-3', level: 'church', target: 100 },
  { orgId: 'ch-ce-kubwa-4', level: 'church', target: 100 },
  { orgId: 'ch-ce-kubwa-5', level: 'church', target: 100 },
  { orgId: 'ch-ce-kubwa-6', level: 'church', target: 100 },
  { orgId: 'ch-ce-kubwa-8', level: 'church', target: 100 },
  { orgId: 'ch-ce-kubwa-9', level: 'church', target: 100 },
  { orgId: 'ch-ce-kubwa-10', level: 'church', target: 150 },
  { orgId: 'ch-ce-mpape', level: 'church', target: 50 },
  { orgId: 'ch-ce-mabuchi', level: 'church', target: 100 },
  { orgId: 'ch-ce-kaba', level: 'church', target: 100 },

  // Kubwa 2 Sub-Group
  { orgId: 'ch-ce-kubwa-ext', level: 'church', target: 200 },
  { orgId: 'ch-ce-channel-8', level: 'church', target: 200 },
  { orgId: 'ch-ce-guidna', level: 'church', target: 200 },
  { orgId: 'ch-ce-grace-and-glory', level: 'church', target: 200 },
  { orgId: 'ch-ce-obasanjo-road', level: 'church', target: 200 },

  // Bwari Group
  { orgId: 'ch-ce-bwari-main', level: 'church', target: 1200 },
  { orgId: 'ch-ce-kuchiko', level: 'church', target: 250 },
  { orgId: 'ch-ce-piawe', level: 'church', target: 100 },
  { orgId: 'ch-ce-peyi', level: 'church', target: 250 },
  { orgId: 'ch-ce-scc', level: 'church', target: 100 },
  { orgId: 'ch-ce-kogo', level: 'church', target: 300 },
  { orgId: 'ch-ce-lambent', level: 'church', target: 150 },
  { orgId: 'ch-ce-garam', level: 'church', target: 150 },

  // New Horizon Group
  { orgId: 'ch-ce-ushafa', level: 'church', target: 1350 },
  { orgId: 'ch-ce-kogo-3', level: 'church', target: 150 },
  { orgId: 'ch-ce-dutse-zone-3', level: 'church', target: 150 },
  { orgId: 'ch-ce-dutse', level: 'church', target: 250 },
  { orgId: 'ch-ce-guto', level: 'church', target: 100 },

  // Gwagwalada 1 Group
  { orgId: 'ch-ce-gwagwalada-1', level: 'church', target: 1000 },
  { orgId: 'ch-ce-zuba', level: 'church', target: 100 },
  { orgId: 'ch-ce-gwagwalada-4', level: 'church', target: 50 },
  { orgId: 'ch-ce-gwagwalada-7', level: 'church', target: 50 },
  { orgId: 'ch-ce-tunga-maje', level: 'church', target: 750 },
  { orgId: 'ch-ce-kwali', level: 'church', target: 50 },

  // Gwagwalada 2 Group
  { orgId: 'ch-ce-gwagwalada-2', level: 'church', target: 1000 },
  { orgId: 'ch-ce-gwagwalada-3', level: 'church', target: 400 },
  { orgId: 'ch-ce-anagada', level: 'church', target: 250 },
  { orgId: 'ch-ce-gwagwalada-6', level: 'church', target: 250 },
  { orgId: 'ch-ce-chukunku', level: 'church', target: 100 },

  // Kuje Group
  { orgId: 'ch-ce-kuje', level: 'church', target: 880 },
  { orgId: 'ch-ce-kuje-2', level: 'church', target: 380 },
  { orgId: 'ch-ce-kuje-3', level: 'church', target: 130 },
  { orgId: 'ch-ce-kuje-4', level: 'church', target: 150 },
  { orgId: 'ch-ce-kuje-5', level: 'church', target: 130 },
  { orgId: 'ch-ce-iddo-sarki', level: 'church', target: 110 },
  { orgId: 'ch-ce-kuje-6', level: 'church', target: 120 },
  { orgId: 'ch-ce-kuje-7', level: 'church', target: 50 },
  { orgId: 'ch-ce-kuje-8', level: 'church', target: 50 },

  // Lokogoma Group
  { orgId: 'ch-ce-lokogoma', level: 'church', target: 1200 },
  { orgId: 'ch-ce-kabusa', level: 'church', target: 150 },
  { orgId: 'ch-ce-durumi', level: 'church', target: 100 },
  { orgId: 'ch-ce-apo', level: 'church', target: 150 },
  { orgId: 'ch-ce-apo-dutse', level: 'church', target: 150 },
  { orgId: 'ch-ce-wumba', level: 'church', target: 150 },
  { orgId: 'ch-ce-gbuduwyi', level: 'church', target: 100 },
  { orgId: 'ch-ce-damagaza', level: 'church', target: 150 },
  { orgId: 'ch-ce-pigbakasa', level: 'church', target: 100 },
  { orgId: 'ch-ce-city-of-david', level: 'church', target: 100 },
  { orgId: 'ch-ce-citadel-of-grace', level: 'church', target: 150 },

  // Dei Dei Group
  { orgId: 'ch-ce-deidei-2', level: 'church', target: 2000 },

  // Airport Road Sub-Group
  { orgId: 'ch-ce-airport-road', level: 'church', target: 1200 },
  { orgId: 'ch-ce-airport-road-2', level: 'church', target: 500 },
  { orgId: 'ch-ce-airport-road-4', level: 'church', target: 300 },
  { orgId: 'ch-ce-kapwa', level: 'church', target: 500 },

  // Dutse Makaranta Sub-Group
  { orgId: 'ch-ce-dutse-makaranta', level: 'church', target: 700 },
  { orgId: 'ch-ce-garki-1', level: 'church', target: 100 },
  { orgId: 'ch-ce-springtime', level: 'church', target: 100 },
  { orgId: 'ch-ce-new-jerusalem', level: 'church', target: 50 },
  { orgId: 'ch-ce-mbuko', level: 'church', target: 50 },

  // Byazhin Church
  { orgId: 'ch-ce-byazhin', level: 'church', target: 1000 },

  // Wealthy Place Church
  { orgId: 'ch-ce-wealthy-place', level: 'church', target: 1000 },

  // CE City Church
  { orgId: 'ch-ce-city-church', level: 'church', target: 1500 },

  // Teens Church Group
  { orgId: 'ch-teens-church', level: 'church', target: 1500 },
];

/** Lookup helper for the official target of an entity from the PDF document */
export function getOfficialTarget(level: 'zone' | 'group' | 'church' | 'pcf', orgId: string): number | undefined {
  if (level === 'pcf') return undefined;
  const match = OFFICIAL_TARGET_MAP.find((m) => m.level === level && m.orgId === orgId);
  return match ? match.target : undefined;
}

/** Generates standard initial target models for all entities based on the official PDF document */
export function getDefaultInitialTargets(): Target[] {
  const now = new Date().toISOString();
  return OFFICIAL_TARGET_MAP.map((item) => ({
    id: `${REACH_OUT_NIGERIA_EVENT.id}_${item.level}_${item.orgId}`,
    eventId: REACH_OUT_NIGERIA_EVENT.id,
    level: item.level,
    organizationId: item.orgId,
    target: item.target,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system',
    status: 'active',
  }));
}

export function mergeTargetsWithDefaults(customTargets: Target[]): Target[] {
  const defaults = getDefaultInitialTargets();
  const map = new Map<string, Target>();

  // 1. Seed with all official PDF targets
  for (const def of defaults) {
    map.set(`${def.level}_${def.organizationId}`, def);
  }

  // 2. Overlay any custom target saved by an admin, but filter out legacy 40000 target entries
  for (const custom of customTargets) {
    if (custom.status === 'active' && custom.target > 0) {
      if (custom.target === 40000 || (custom.level === 'zone' && custom.target < 50000)) {
        continue;
      }
      map.set(`${custom.level}_${custom.organizationId}`, custom);
    }
  }

  return Array.from(map.values());
}

/**
 * Resets all targets across groups and churches to the exact official values from the PDF document.
 * This can be triggered by Super Admin to repair any corrupted or flattened targets.
 */
export async function resetTargetsToOfficialDefaults(actorId: string = 'superAdmin'): Promise<Target[]> {
  const defaults = getDefaultInitialTargets();
  setCachedLocalTargets(defaults);

  if (navigator.onLine) {
    try {
      const promises = defaults.map((t) => {
        const docRef = doc(db, TARGETS_COLLECTION, t.id);
        return setDoc(docRef, t, { merge: true });
      });
      await Promise.all(promises);
    } catch (err) {
      console.warn('Error syncing reset targets to Firestore:', err);
    }
  }

  try {
    await writeAdminAuditLog(
      'targets_reset_official_pdf',
      actorId,
      'zone-abuja-1',
      'Reset all Group and Church targets to the official PDF values.'
    );
  } catch (err) {
    console.warn('Error writing audit log for target reset:', err);
  }

  return defaults;
}

