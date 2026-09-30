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
/** Normalizes organization string: lowercase, trims, maps gwarimpa -> gwarinpa, and strips non-alphanumeric */
export function cleanOrgString(str?: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/gwarimpa/g, 'gwarinpa')
    .replace(/[^a-z0-9]/g, '');
}

/** Resolves any group reference (ID, name, code, or parent of church) to the canonical Group entity */
export function findCanonicalGroup(
  groupId: string | undefined,
  groupName: string | undefined,
  churchId: string | undefined,
  churchName: string | undefined,
  groups: Group[],
  churches?: Church[]
): Group | undefined {
  // 1. Direct or normalized Group ID match
  if (groupId) {
    const direct = groups.find((g) => g.id === groupId);
    if (direct) return direct;

    const cleanGId = cleanOrgString(groupId);
    const norm = groups.find((g) => cleanOrgString(g.id) === cleanGId || cleanOrgString(g.code) === cleanGId);
    if (norm) return norm;
  }

  // 2. Resolve via Church ID or Name if available
  if ((churchId || churchName) && churches && churches.length > 0) {
    const matchedChurch = findCanonicalChurch(churchId, churchName, churches);
    if (matchedChurch?.groupId) {
      const parentGrp = groups.find(
        (g) => g.id === matchedChurch.groupId || cleanOrgString(g.id) === cleanOrgString(matchedChurch.groupId)
      );
      if (parentGrp) return parentGrp;
    }
  }

  // 3. Match by groupName / code fuzzy
  if (groupName) {
    const cleanGName = cleanOrgString(groupName);
    const byName = groups.find((g) => {
      const gClean = cleanOrgString(g.name);
      const codeClean = cleanOrgString(g.code);
      return (
        gClean === cleanGName ||
        codeClean === cleanGName ||
        (cleanGName.length >= 4 && (gClean.includes(cleanGName) || cleanGName.includes(gClean)))
      );
    });
    if (byName) return byName;
  }

  return undefined;
}

/** Resolves any church reference (ID, name, or code) to the canonical Church entity */
export function findCanonicalChurch(
  churchId: string | undefined,
  churchName: string | undefined,
  churches: Church[]
): Church | undefined {
  if (churchId) {
    const direct = churches.find((c) => c.id === churchId);
    if (direct) return direct;

    const cleanCId = cleanOrgString(churchId);
    const norm = churches.find((c) => cleanOrgString(c.id) === cleanCId || cleanOrgString(c.code) === cleanCId);
    if (norm) return norm;
  }

  if (churchName) {
    const cleanCName = cleanOrgString(churchName);
    const byName = churches.find((c) => {
      const cClean = cleanOrgString(c.name);
      const codeClean = cleanOrgString(c.code);
      return (
        cClean === cleanCName ||
        codeClean === cleanCName ||
        (cleanCName.length >= 4 && (cClean.includes(cleanCName) || cleanCName.includes(cClean)))
      );
    });
    if (byName) return byName;
  }

  return undefined;
}

/**
 * Calculates aggregate progress across groups for the Upward Race.
 * Checks targetsList first, then falls back to the exact official PDF target for that specific group.
 */
export function calculateGroupRaceProgress(
  records: Array<{ groupId?: string; groupName?: string; churchId?: string; churchName?: string }>,
  groups: Group[],
  targetsList: Target[],
  defaultGroupTarget?: number,
  churches?: Church[]
): OrganizationProgress[] {
  // 1. Calculate actual soul count per canonical group ID from valid records
  const groupActualCounts = new Map<string, number>();

  records.forEach((rec) => {
    const canonicalGroup = findCanonicalGroup(
      rec.groupId,
      rec.groupName,
      rec.churchId,
      rec.churchName,
      groups,
      churches
    );

    if (canonicalGroup) {
      groupActualCounts.set(canonicalGroup.id, (groupActualCounts.get(canonicalGroup.id) || 0) + 1);
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
  records: Array<{ groupId?: string; churchId?: string; churchName?: string; groupName?: string }>,
  churches: Church[],
  targetsList: Target[],
  groupId?: string,
  defaultChurchTarget?: number
): OrganizationProgress[] {
  const targetChurches = groupId
    ? churches.filter((c) => {
        const cleanTargetGId = cleanOrgString(groupId);
        return c.groupId === groupId || cleanOrgString(c.groupId) === cleanTargetGId;
      })
    : churches;

  const churchActualCounts = new Map<string, number>();
  records.forEach((rec) => {
    const canonicalChurch = findCanonicalChurch(rec.churchId, rec.churchName, churches);

    if (canonicalChurch) {
      churchActualCounts.set(canonicalChurch.id, (churchActualCounts.get(canonicalChurch.id) || 0) + 1);
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

