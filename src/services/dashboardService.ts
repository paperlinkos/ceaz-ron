import { getAllLocalRecords } from './indexedDbService';
import { getGroups, getChurches, getPCFs } from './organizationService';
import { getTargets, getOfficialTarget } from './targetService';
import { getLocalEventConfig } from './eventService';
import { getUserScope, isAuthorizedForOrg, type UserScope } from './roleScopeService';
import { calculateOrganizationProgress } from './targetProgressEngine';
import type { UserProfile, SoulWinnerProfile } from '../types/auth';
import type { TargetLevel, OrganizationProgress } from '../types/target';
import type { Group, Church, PCF } from '../types/organization';

export interface BreadcrumbItem {
  id: string;
  name: string;
  level: TargetLevel;
}

export interface ChildProgressItem extends OrganizationProgress {
  childCount?: number;
}

export interface SoulWinnerContribution {
  id: string;
  name: string;
  soulsWon: number;
}

export interface DashboardViewData {
  userScope: UserScope;
  activeOrgId: string;
  activeOrgName: string;
  activeLevel: TargetLevel | 'soulWinner';
  actual: number;
  target: number;
  percentage: number;
  normalizedProgress: number;
  isTargetExceeded: boolean;
  displayPercentage: string;
  remainingTarget: number;
  breadcrumbs: BreadcrumbItem[];
  children: ChildProgressItem[];
  soulWinners?: SoulWinnerContribution[];
  isUnauthorizedView?: boolean;
}

/**
 * Aggregates role-scoped progress data for management dashboards
 */
export async function getDashboardViewData(
  userProfile: UserProfile | null,
  soulWinnerProfile: SoulWinnerProfile | null,
  requestedOrgId?: string,
  requestedLevel?: TargetLevel
): Promise<DashboardViewData> {
  const userScope = getUserScope(userProfile, soulWinnerProfile);
  const [records, groups, churches, pcfs, targets] = await Promise.all([
    getAllLocalRecords(),
    getGroups(),
    getChurches(),
    getPCFs(),
    getTargets(),
  ]);

  // Determine authorized active org
  let activeLevel: TargetLevel = requestedLevel || (userScope.level === 'soulWinner' ? 'church' : userScope.level);
  let activeOrgId: string = requestedOrgId || userScope.orgId || 'zone-abuja-1';

  // Security Check: If requesting an org outside user scope, fall back to scope org
  if (requestedOrgId && !userScope.isSuperAdmin) {
    const isAuth = isAuthorizedForOrg(userScope, requestedOrgId, activeLevel, groups, churches, pcfs);
    if (!isAuth) {
      activeLevel = userScope.level === 'soulWinner' ? 'church' : userScope.level;
      activeOrgId = userScope.orgId || 'zone-abuja-1';
    }
  }

  // Get active org details and target
  let activeOrgName = 'Reach Out Nigeria Zone';
  let filteredRecords = records;

  if (activeLevel === 'zone') {
    activeOrgName = 'Reach Out Nigeria Zone';
  } else if (activeLevel === 'group') {
    const g = groups.find((grp) => grp.id === activeOrgId);
    activeOrgName = g ? g.name : activeOrgId;
    filteredRecords = records.filter((r) => r.groupId === activeOrgId);
  } else if (activeLevel === 'church' || activeLevel === 'pcf') {
    activeLevel = 'church';
    const c = churches.find((ch) => ch.id === activeOrgId);
    activeOrgName = c ? c.name : activeOrgId;
    filteredRecords = records.filter((r) => r.churchId === activeOrgId);
  }

  const actual = filteredRecords.length;

  // Resolve target
  const targetObj = targets.find(
    (t) => t.level === activeLevel && t.organizationId === activeOrgId && t.status === 'active'
  );
  
  // Default target fallback if not custom set — query official PDF target map first
  const officialTarget = getOfficialTarget(activeLevel, activeOrgId);
  const defaultTarget = officialTarget ?? (activeLevel === 'zone' ? (getLocalEventConfig().target || 40000) : activeLevel === 'group' ? 2000 : 250);
  const target = targetObj ? targetObj.target : defaultTarget;

  const mainProgress = calculateOrganizationProgress({
    organizationId: activeOrgId,
    organizationName: activeOrgName,
    level: activeLevel,
    actual,
    target,
  });

  const remainingTarget = Math.max(0, target - actual);

  // Build Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = buildBreadcrumbs(activeLevel, activeOrgId, groups, churches, pcfs);

  // Build Children Progress List
  let children: ChildProgressItem[] = [];
  let soulWinners: SoulWinnerContribution[] = [];

  if (activeLevel === 'zone') {
    children = groups.map((g) => {
      const gRecords = records.filter((r) => r.groupId === g.id);
      const gTargetObj = targets.find((t) => t.level === 'group' && t.organizationId === g.id && t.status === 'active');
      const gTarget = gTargetObj ? gTargetObj.target : (getOfficialTarget('group', g.id) ?? 2000);
      const prog = calculateOrganizationProgress({
        organizationId: g.id,
        organizationName: g.name,
        organizationCode: g.code,
        level: 'group',
        actual: gRecords.length,
        target: gTarget,
      });
      return { ...prog, childCount: churches.filter((c) => c.groupId === g.id).length };
    });
  } else if (activeLevel === 'group') {
    const childChurches = churches.filter((c) => c.groupId === activeOrgId);
    children = childChurches.map((c) => {
      const cRecords = records.filter((r) => r.churchId === c.id);
      const cTargetObj = targets.find((t) => t.level === 'church' && t.organizationId === c.id && t.status === 'active');
      const cTarget = cTargetObj ? cTargetObj.target : (getOfficialTarget('church', c.id) ?? 250);
      const prog = calculateOrganizationProgress({
        organizationId: c.id,
        organizationName: c.name,
        organizationCode: c.code,
        level: 'church',
        actual: cRecords.length,
        target: cTarget,
      });
      return { ...prog, childCount: cRecords.length };
    });
  } else if (activeLevel === 'church') {
    // For Church level, aggregate soul counts per Soul Winner
    const winnerMap = new Map<string, { id: string; name: string; count: number }>();
    filteredRecords.forEach((rec) => {
      const swId = rec.soulWinnerId || 'anonymous';
      const swName = rec.soulWinnerId ? `Soul Winner #${rec.soulWinnerId.substring(0, 6)}` : 'Soul Winner';
      const existing = winnerMap.get(swId);
      if (existing) {
        existing.count += 1;
      } else {
        winnerMap.set(swId, { id: swId, name: swName, count: 1 });
      }
    });

    soulWinners = Array.from(winnerMap.values()).map((w) => ({
      id: w.id,
      name: w.name,
      soulsWon: w.count,
    }));
    soulWinners.sort((a, b) => b.soulsWon - a.soulsWon);
  }

  // Sort children by percentage / actual descending
  children.sort((a, b) => b.percentage - a.percentage || b.actual - a.actual);

  return {
    userScope,
    activeOrgId,
    activeOrgName,
    activeLevel,
    actual: mainProgress.actual,
    target: mainProgress.target,
    percentage: mainProgress.percentage,
    normalizedProgress: mainProgress.normalizedProgress,
    isTargetExceeded: mainProgress.isTargetExceeded,
    displayPercentage: mainProgress.displayPercentage,
    remainingTarget,
    breadcrumbs,
    children,
    soulWinners,
  };
}

function buildBreadcrumbs(
  level: TargetLevel,
  orgId: string,
  groups: Group[],
  churches: Church[],
  pcfs: PCF[]
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ id: 'default_zone', name: 'Reach Out Nigeria Zone', level: 'zone' }];

  if (level === 'zone') return crumbs;

  if (level === 'group') {
    const g = groups.find((grp) => grp.id === orgId);
    if (g) crumbs.push({ id: g.id, name: g.name, level: 'group' });
    return crumbs;
  }

  if (level === 'church') {
    const c = churches.find((ch) => ch.id === orgId);
    if (c) {
      const g = groups.find((grp) => grp.id === c.groupId);
      if (g) crumbs.push({ id: g.id, name: g.name, level: 'group' });
      crumbs.push({ id: c.id, name: c.name, level: 'church' });
    }
    return crumbs;
  }

  if (level === 'pcf') {
    const p = pcfs.find((item) => item.id === orgId);
    if (p) {
      const c = churches.find((ch) => ch.id === p.churchId);
      if (c) {
        const g = groups.find((grp) => grp.id === c.groupId);
        if (g) crumbs.push({ id: g.id, name: g.name, level: 'group' });
        crumbs.push({ id: c.id, name: c.name, level: 'church' });
      }
      crumbs.push({ id: p.id, name: p.name, level: 'pcf' });
    }
    return crumbs;
  }

  return crumbs;
}
