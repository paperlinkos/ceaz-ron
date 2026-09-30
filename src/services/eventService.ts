import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  type EventConfig,
  type EventStatus,
  type EventAuditLog,
  type CelebrationTrigger,
  DEFAULT_EVENT_CONFIG,
} from '../config/eventConfig';
import { generateUUID } from '../utils/uuid';

const LOCAL_EVENT_KEY = 'ron_harvest_event_config';

/** Read cached event configuration from localStorage */
export function getLocalEventConfig(): EventConfig {
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_KEY);
    if (raw) {
      const parsed: EventConfig = JSON.parse(raw);
      if (parsed.target === 40000 || !parsed.target) {
        parsed.target = DEFAULT_EVENT_CONFIG.target;
        parsed.announcements = DEFAULT_EVENT_CONFIG.announcements;
        setLocalEventConfig(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse local event config:', err);
  }
  return DEFAULT_EVENT_CONFIG;
}

/** Save event configuration to localStorage */
export function setLocalEventConfig(config: EventConfig): void {
  try {
    localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to save local event config:', err);
  }
}

/** Fetch or initialize event config from Firestore */
export async function getEventConfig(eventId: string = DEFAULT_EVENT_CONFIG.id): Promise<EventConfig> {
  try {
    const docRef = doc(db, 'events', eventId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as EventConfig;
      if (data.target === 40000) {
        data.target = DEFAULT_EVENT_CONFIG.target;
        data.announcements = DEFAULT_EVENT_CONFIG.announcements;
        await setDoc(docRef, data, { merge: true });
      }
      setLocalEventConfig(data);
      return data;
    } else {
      // Initialize Firestore document if first time
      const initialConfig: EventConfig = {
        ...DEFAULT_EVENT_CONFIG,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, initialConfig);
      setLocalEventConfig(initialConfig);
      return initialConfig;
    }
  } catch (err) {
    console.warn('Error reading event config from Firestore, returning local cache:', err);
    return getLocalEventConfig();
  }
}

/** Subscribe to real-time event configuration changes */
export function subscribeToEventConfig(
  eventId: string = DEFAULT_EVENT_CONFIG.id,
  onUpdate: (config: EventConfig) => void
): () => void {
  const docRef = doc(db, 'events', eventId);

  try {
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data() as EventConfig;
          // Guard: never let a stale/legacy 40000 target override the correct 50000
          const data: EventConfig = {
            ...raw,
            target: (raw.target != null && raw.target >= 50000) ? raw.target : 50000,
          };
          setLocalEventConfig(data);
          onUpdate(data);
        } else {
          onUpdate(getLocalEventConfig());
        }
      },
      (error) => {
        console.warn('Real-time event config subscription warning:', error);
        onUpdate(getLocalEventConfig());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to event config snapshot:', err);
    onUpdate(getLocalEventConfig());
    return () => {};
  }
}

/** SuperAdmin function to transition event state with audit logging */
export async function updateEventStatus(
  eventId: string,
  newStatus: EventStatus,
  actorId: string
): Promise<{ success: boolean; config?: EventConfig; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const docRef = doc(db, 'events', eventId);
    const snap = await getDoc(docRef);

    const currentConfig: EventConfig = snap.exists()
      ? (snap.data() as EventConfig)
      : { ...DEFAULT_EVENT_CONFIG };

    const updates: Partial<EventConfig> = {
      status: newStatus,
      updatedAt: nowIso,
    };

    if (newStatus === 'live' && !currentConfig.startAt) {
      updates.startAt = nowIso;
    }

    if (newStatus === 'completed' && !currentConfig.endAt) {
      updates.endAt = nowIso;
    }

    // 1. Update event document in Firestore
    if (snap.exists()) {
      await updateDoc(docRef, updates);
    } else {
      await setDoc(docRef, { ...currentConfig, ...updates });
    }

    const updatedConfig: EventConfig = {
      ...currentConfig,
      ...updates,
    };

    setLocalEventConfig(updatedConfig);

    // 2. Create Audit Log entry
    const auditLogId = generateUUID();
    const auditEntry: EventAuditLog = {
      id: auditLogId,
      eventId,
      action: newStatus === 'live' ? 'event_started' : 'event_ended',
      actorId: actorId || 'super-admin',
      timestamp: nowIso,
    };

    const auditRef = doc(db, 'eventAuditLogs', auditLogId);
    await setDoc(auditRef, auditEntry);

    return { success: true, config: updatedConfig };
  } catch (err: unknown) {
    console.error('Error updating event status:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to update event status';
    return { success: false, error: errorMessage };
  }
}

/** Fetch audit log entries for SuperAdmin review */
export async function getEventAuditLogs(eventId: string = DEFAULT_EVENT_CONFIG.id): Promise<EventAuditLog[]> {
  try {
    const q = query(
      collection(db, 'eventAuditLogs'),
      where('eventId', '==', eventId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EventAuditLog);
  } catch (err) {
    console.warn('Error fetching audit logs:', err);
    return [];
  }
}

/** SuperAdmin function to update campaign settings, targets, thresholds, presets, and milestones */
export async function updateEventConfig(
  eventId: string,
  partialUpdates: Partial<EventConfig>,
  actorId: string = 'superAdmin'
): Promise<{ success: boolean; config?: EventConfig; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const docRef = doc(db, 'events', eventId);
    const snap = await getDoc(docRef);

    const currentConfig: EventConfig = snap.exists()
      ? (snap.data() as EventConfig)
      : { ...DEFAULT_EVENT_CONFIG };

    const updates: Partial<EventConfig> = {
      ...partialUpdates,
      updatedAt: nowIso,
    };

    if (snap.exists()) {
      await updateDoc(docRef, updates);
    } else {
      await setDoc(docRef, { ...currentConfig, ...updates });
    }

    const updatedConfig: EventConfig = {
      ...currentConfig,
      ...updates,
    };

    setLocalEventConfig(updatedConfig);

    // Write audit log
    const auditLogId = generateUUID();
    const auditEntry: EventAuditLog = {
      id: auditLogId,
      eventId,
      action: 'settings_updated',
      actorId,
      timestamp: nowIso,
      details: Object.keys(partialUpdates).join(', '),
    };
    try {
      const auditRef = doc(db, 'eventAuditLogs', auditLogId);
      await setDoc(auditRef, auditEntry);
    } catch (auditErr) {
      console.warn('Could not write settings audit log:', auditErr);
    }

    return { success: true, config: updatedConfig };
  } catch (err: unknown) {
    console.error('Error updating event config:', err);
    // Maintain offline resiliency
    const current = getLocalEventConfig();
    const fallbackConfig: EventConfig = {
      ...current,
      ...partialUpdates,
      updatedAt: new Date().toISOString(),
    };
    setLocalEventConfig(fallbackConfig);
    return { success: true, config: fallbackConfig };
  }
}

/** Broadcast a real-time celebration or milestone event to all viewing screens */
export async function triggerLiveCelebration(
  eventId: string = DEFAULT_EVENT_CONFIG.id,
  payload: {
    type?: 'manual' | 'milestone';
    milestoneValue?: number;
    message?: string;
    actorId?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'events', eventId);
    const trigger: CelebrationTrigger = {
      id: generateUUID(),
      timestamp: Date.now(),
      type: payload.type || 'manual',
      message: payload.message || 'SPECIAL ZONAL CELEBRATION!',
      triggeredBy: payload.actorId || 'superAdmin',
      ...(payload.milestoneValue != null ? { milestoneValue: payload.milestoneValue } : {}),
    };

    await updateDoc(docRef, {
      lastCelebrationTrigger: trigger,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: unknown) {
    console.error('Error triggering live celebration in Firestore:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to trigger celebration',
    };
  }
}

