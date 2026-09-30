import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { MilestoneAlert } from '../config/eventConfig';
import { triggerLiveCelebration } from './eventService';
import type { Church, Group } from '../types/organization';
import type { Target } from '../types/target';
import { getOfficialTarget } from './targetService';

const COLLECTION_NAME = 'milestoneAlerts';

/**
 * Real-time listener for milestone alerts in Firestore.
 * Notifies the Super Admin and Support Team whenever an alert is created, released, or updated.
 */
export function subscribeToMilestoneAlerts(
  callback: (alerts: MilestoneAlert[]) => void
): () => void {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const alerts: MilestoneAlert[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            eventId: data.eventId || 'ron-2026-oct1',
            entityType: data.entityType,
            entityId: data.entityId,
            entityName: data.entityName,
            groupName: data.groupName,
            milestoneType: data.milestoneType,
            milestoneValue: data.milestoneValue,
            actual: data.actual,
            target: data.target,
            percentage: data.percentage,
            headline: data.headline,
            subheadline: data.subheadline,
            timestamp: data.timestamp,
            status: data.status || 'pending',
            releasedAt: data.releasedAt,
            releasedBy: data.releasedBy,
          };
        });
        callback(alerts);
      },
      (error) => {
        console.warn('Error subscribing to milestone alerts in Firestore:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to initialize milestone alerts listener:', err);
    return () => {};
  }
}

/**
 * Evaluates all churches and groups against smart milestone thresholds.
 * Automatically posts new pending alerts to Firestore if a threshold has been reached.
 */
export async function evaluateAndGenerateMilestones(
  records: Array<{ groupId?: string; churchId?: string }>,
  churches: Church[],
  groups: Group[],
  targetsList: Target[]
): Promise<MilestoneAlert[]> {
  const newAlerts: MilestoneAlert[] = [];

  // Group maps for quick lookups
  const groupMap = new Map<string, string>();
  groups.forEach((g) => groupMap.set(g.id, g.name));

  const churchActualCounts = new Map<string, number>();
  const groupActualCounts = new Map<string, number>();

  records.forEach((rec) => {
    if (rec.churchId) {
      churchActualCounts.set(rec.churchId, (churchActualCounts.get(rec.churchId) || 0) + 1);
    }
    if (rec.groupId) {
      groupActualCounts.set(rec.groupId, (groupActualCounts.get(rec.groupId) || 0) + 1);
    }
  });

  const churchTargetsMap = new Map<string, number>();
  const groupTargetsMap = new Map<string, number>();

  targetsList.forEach((t) => {
    if (t.status === 'active') {
      if (t.level === 'church') {
        churchTargetsMap.set(t.organizationId, t.target);
      } else if (t.level === 'group') {
        groupTargetsMap.set(t.organizationId, t.target);
      }
    }
  });

  // 1. EVALUATE CHURCH MILESTONES
  churches.forEach((church) => {
    const actual = churchActualCounts.get(church.id) || 0;
    const target =
      churchTargetsMap.get(church.id) ??
      getOfficialTarget('church', church.id) ??
      100;
    const groupName = groupMap.get(church.groupId) || 'Abuja Zone 1';

    if (actual <= 0 || target <= 0) return;

    const percentage = Math.round((actual / target) * 1000) / 10; // e.g. 101.5%

    // A. Percentage thresholds: 50%, 75%, 100%, 150%
    const pctMilestones = [
      { pct: 150, headline: '🚀 TARGET EXCEEDED (150%+)', sub: `Remarkable! ${actual.toLocaleString()} souls won out of ${target.toLocaleString()} target (${percentage}%).` },
      { pct: 100, headline: '👑 100% TARGET ACHIEVED!', sub: `Glory to God! ${actual.toLocaleString()} souls won, completely conquering the ${target.toLocaleString()} target!` },
      { pct: 75, headline: '🥇 75% TARGET ACCOMPLISHED', sub: `Surging forward with ${actual.toLocaleString()} / ${target.toLocaleString()} souls won (${percentage}%).` },
      { pct: 50, headline: '🥈 HALFWAY MARK (50% REACHED)', sub: `Solid momentum! ${actual.toLocaleString()} / ${target.toLocaleString()} souls won (${percentage}%).` },
    ];

    for (const item of pctMilestones) {
      if (percentage >= item.pct) {
        const alertId = `alert_church_${church.id}_pct_${item.pct}`;
        newAlerts.push({
          id: alertId,
          eventId: 'ron-2026-oct1',
          entityType: 'church',
          entityId: church.id,
          entityName: church.name,
          groupName,
          milestoneType: 'percentage',
          milestoneValue: item.pct,
          actual,
          target,
          percentage,
          headline: `${church.name.toUpperCase()} — ${item.headline}`,
          subheadline: item.sub,
          timestamp: Date.now(),
          status: 'pending',
        });
        break; // Only capture the highest unreleased percentage milestone in this pass
      }
    }

    // B. Volume milestones for churches (every 1,000 souls)
    if (actual >= 1000) {
      const volumeStep = Math.floor(actual / 1000) * 1000;
      const alertId = `alert_church_${church.id}_vol_${volumeStep}`;
      newAlerts.push({
        id: alertId,
        eventId: 'ron-2026-oct1',
        entityType: 'church',
        entityId: church.id,
        entityName: church.name,
        groupName,
        milestoneType: 'volume',
        milestoneValue: volumeStep,
        actual,
        target,
        percentage,
        headline: `🎉 ${church.name.toUpperCase()} CROSSES ${volumeStep.toLocaleString()} SOULS!`,
        subheadline: `A great harvest of ${actual.toLocaleString()} souls won in ${groupName}!`,
        timestamp: Date.now(),
        status: 'pending',
      });
    }
  });

  // 2. EVALUATE GROUP MILESTONES
  groups.forEach((group) => {
    const actual = groupActualCounts.get(group.id) || 0;
    const target =
      groupTargetsMap.get(group.id) ??
      getOfficialTarget('group', group.id) ??
      5000;

    if (actual <= 0 || target <= 0) return;

    const percentage = Math.round((actual / target) * 1000) / 10;

    // A. Percentage thresholds: 50%, 75%, 100%, 150%
    const pctMilestones = [
      { pct: 150, headline: '🌟 GROUP EXCEEDS TARGET (150%+)', sub: `Sensational increase! ${actual.toLocaleString()} souls won out of ${target.toLocaleString()} target (${percentage}%).` },
      { pct: 100, headline: '👑 GROUP 100% TARGET FULFILLED!', sub: `Triumphant victory! All churches in ${group.name} combine for ${actual.toLocaleString()} souls won!` },
      { pct: 75, headline: '🥇 75% OF GROUP TARGET HIT', sub: `Closing in on full conquest: ${actual.toLocaleString()} / ${target.toLocaleString()} souls won (${percentage}%).` },
      { pct: 50, headline: '🥈 50% HALFWAY POINT REACHED', sub: `Halfway milestone conquered: ${actual.toLocaleString()} / ${target.toLocaleString()} souls won (${percentage}%).` },
    ];

    for (const item of pctMilestones) {
      if (percentage >= item.pct) {
        const alertId = `alert_group_${group.id}_pct_${item.pct}`;
        newAlerts.push({
          id: alertId,
          eventId: 'ron-2026-oct1',
          entityType: 'group',
          entityId: group.id,
          entityName: group.name,
          milestoneType: 'percentage',
          milestoneValue: item.pct,
          actual,
          target,
          percentage,
          headline: `${group.name.toUpperCase()} — ${item.headline}`,
          subheadline: item.sub,
          timestamp: Date.now(),
          status: 'pending',
        });
        break;
      }
    }

    // B. Volume milestones for groups (every 5,000 souls)
    if (actual >= 5000) {
      const volumeStep = Math.floor(actual / 5000) * 5000;
      const alertId = `alert_group_${group.id}_vol_${volumeStep}`;
      newAlerts.push({
        id: alertId,
        eventId: 'ron-2026-oct1',
        entityType: 'group',
        entityId: group.id,
        entityName: group.name,
        milestoneType: 'volume',
        milestoneValue: volumeStep,
        actual,
        target,
        percentage,
        headline: `🏆 ${group.name.toUpperCase()} CROSSES ${volumeStep.toLocaleString()} SOULS!`,
        subheadline: `Phenomenal group achievement of ${actual.toLocaleString()} souls won!`,
        timestamp: Date.now(),
        status: 'pending',
      });
    }
  });

  // Sync to Firestore without overwriting already released or dismissed alerts
  for (const alert of newAlerts) {
    try {
      const alertRef = doc(db, COLLECTION_NAME, alert.id);
      // setDoc with merge will not overwrite if already released
      await setDoc(
        alertRef,
        {
          eventId: alert.eventId,
          entityType: alert.entityType,
          entityId: alert.entityId,
          entityName: alert.entityName,
          ...(alert.groupName ? { groupName: alert.groupName } : {}),
          milestoneType: alert.milestoneType,
          milestoneValue: alert.milestoneValue,
          actual: alert.actual,
          target: alert.target,
          percentage: alert.percentage,
          headline: alert.headline,
          subheadline: alert.subheadline,
          timestamp: alert.timestamp,
          status: 'pending', // fallback for new alerts
        },
        { merge: true }
      );
    } catch (err) {
      console.warn(`Failed to sync alert ${alert.id}:`, err);
    }
  }

  return newAlerts;
}

/**
 * Super Admin releases the milestone celebration.
 * Immediately pushes the full-screen celebration broadcast to all viewing screens in real time.
 */
export async function releaseMilestoneCelebration(
  alert: MilestoneAlert,
  customMessage?: string,
  actorId: string = 'superAdmin'
): Promise<boolean> {
  try {
    const alertRef = doc(db, COLLECTION_NAME, alert.id);

    // 1. Mark alert as released in Firestore
    await updateDoc(alertRef, {
      status: 'released',
      releasedAt: Date.now(),
      releasedBy: actorId,
    });

    // 2. Broadcast live celebration trigger with complete rich context
    const broadcastResult = await triggerLiveCelebration('ron-2026-oct1', {
      type: alert.entityType === 'church' ? 'church_milestone' : 'group_milestone',
      entityType: alert.entityType,
      entityId: alert.entityId,
      entityName: alert.entityName,
      groupName: alert.groupName,
      milestoneValue: alert.milestoneValue,
      actual: alert.actual,
      target: alert.target,
      percentage: alert.percentage,
      headline: alert.headline,
      message: customMessage || alert.subheadline,
      actorId,
    });

    return broadcastResult.success;
  } catch (err) {
    console.error('Failed to release milestone celebration:', err);
    return false;
  }
}

/**
 * Super Admin dismisses an alert without triggering celebration.
 */
export async function dismissMilestoneAlert(
  alertId: string,
  actorId: string = 'superAdmin'
): Promise<boolean> {
  try {
    const alertRef = doc(db, COLLECTION_NAME, alertId);
    await updateDoc(alertRef, {
      status: 'dismissed',
      dismissedAt: Date.now(),
      dismissedBy: actorId,
    });
    return true;
  } catch (err) {
    console.error('Failed to dismiss alert:', err);
    return false;
  }
}

/**
 * Direct Manual Release: Super Admin selects any church or group and broadcasts a celebration immediately.
 */
export async function triggerDirectEntityCelebration(payload: {
  entityType: 'church' | 'group';
  entityName: string;
  groupName?: string;
  headline?: string;
  message: string;
  actual?: number;
  target?: number;
  percentage?: number;
  actorId?: string;
}): Promise<boolean> {
  const result = await triggerLiveCelebration('ron-2026-oct1', {
    type: payload.entityType === 'church' ? 'church_milestone' : 'group_milestone',
    entityType: payload.entityType,
    entityName: payload.entityName,
    groupName: payload.groupName,
    actual: payload.actual,
    target: payload.target,
    percentage: payload.percentage,
    headline: payload.headline || `${payload.entityName.toUpperCase()} CELEBRATION!`,
    message: payload.message,
    actorId: payload.actorId || 'superAdmin',
  });

  return result.success;
}
