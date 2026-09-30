import type { Target, TargetLevel, OrganizationProgress } from '../types/target';
import type { Group, Church } from '../types/organization';
import { getOfficialTarget } from './targetService';

export interface CalculateProgressInput {
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
  level: TargetLevel;
  actual: number;
  target?: number;
}

/**
 * Core Target + Progress Engine
 * Computes actual, target, uncapped percentage, normalized progress (0.0-1.0), and target exceeded status.
 */
export function calculateOrganizationProgress(input: CalculateProgressInput): OrganizationProgress {
  const { organizationId, organizationName, organizationCode, level, actual, target } = input;

  const validActual = Math.max(0, Math.floor(actual || 0));

  if (target === undefined || target === null || target <= 0 || isNaN(target)) {
    return {
      organizationId,
      organizationName,
      organizationCode,
      level,
      actual: validActual,
      target: 0,
      percentage: 0,
      normalizedProgress: 0,
      isTargetExceeded: false,
      hasTarget: false,
      displayPercentage: 'TARGET NOT SET',
    };
  }

  const rawPercentage = (validActual / target) * 100;
  const percentage = Math.round(rawPercentage * 10) / 10;
  const normalizedProgress = Math.min(1.0, validActual / target);
  const isTargetExceeded = validActual > target;

  return {
    organizationId,
    organizationName,
    organizationCode,
    level,
    actual: validActual,
    target,
    percentage,
    normalizedProgress,
    isTargetExceeded,
    hasTarget: true,
    displayPercentage: `${percentage}%`,
  };
}

/**
 * Calculates aggregate progress across groups for the Upward Race.
 * Checks targetsList first, then falls back to the exact official PDF target for that specific group.
 */
export function calculateGroupRaceProgress(
  records: Array<{ groupId?: string }>,
  groups: Group[],
  targetsList: Target[],
  defaultGroupTarget?: number
): OrganizationProgress[] {
  // 1. Calculate actual soul count per group ID from valid records
  const groupActualCounts = new Map<string, number>();

  records.forEach((rec) => {
    if (rec.groupId) {
      groupActualCounts.set(rec.groupId, (groupActualCounts.get(rec.groupId) || 0) + 1);
    }
  });

  // 2. Map targets by group organization ID
  const targetsMap = new Map<string, number>();
  targetsList.forEach((t) => {
    if (t.level === 'group' && t.status === 'active') {
      targetsMap.set(t.organizationId, t.target);
    }
  });

  // 3. Calculate progress for each group
  const results: OrganizationProgress[] = groups.map((g) => {
    const actual = groupActualCounts.get(g.id) || 0;
    const groupTarget = targetsMap.get(g.id) ?? getOfficialTarget('group', g.id) ?? defaultGroupTarget ?? 1000;

    return calculateOrganizationProgress({
      organizationId: g.id,
      organizationName: g.name,
      organizationCode: g.code,
      level: 'group',
      actual,
      target: groupTarget,
    });
  });

  // Sort competitors by percentage / actual souls descending
  results.sort((a, b) => b.percentage - a.percentage || b.actual - a.actual);

  return results;
}

/**
 * Calculates aggregate progress across churches (optionally filtered by groupId).
 * Checks targetsList first, then falls back to the exact official PDF target for that specific church.
 */
export function calculateChurchRaceProgress(
  records: Array<{ groupId?: string; churchId?: string }>,
  churches: Church[],
  targetsList: Target[],
  groupId?: string,
  defaultChurchTarget?: number
): OrganizationProgress[] {
  const targetChurches = groupId ? churches.filter((c) => c.groupId === groupId) : churches;

  const churchActualCounts = new Map<string, number>();
  records.forEach((rec) => {
    if (rec.churchId) {
      churchActualCounts.set(rec.churchId, (churchActualCounts.get(rec.churchId) || 0) + 1);
    }
  });

  const targetsMap = new Map<string, number>();
  targetsList.forEach((t) => {
    if (t.level === 'church' && t.status === 'active') {
      targetsMap.set(t.organizationId, t.target);
    }
  });

  const results: OrganizationProgress[] = targetChurches.map((c) => {
    const actual = churchActualCounts.get(c.id) || 0;
    const churchTarget = targetsMap.get(c.id) ?? getOfficialTarget('church', c.id) ?? defaultChurchTarget ?? 100;

    return calculateOrganizationProgress({
      organizationId: c.id,
      organizationName: c.name,
      organizationCode: c.code,
      level: 'church',
      actual,
      target: churchTarget,
    });
  });

  results.sort((a, b) => b.percentage - a.percentage || b.actual - a.actual || a.organizationName.localeCompare(b.organizationName));

  return results;
}

