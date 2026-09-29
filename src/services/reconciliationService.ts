import { getZones, getGroups, getChurches, getPCFs } from './organizationService';
import { getAllUsers, getAllSoulWinnerProfiles } from './userService';
import { getTargets } from './targetService';
import { getAllLocalRecords } from './indexedDbService';
import { calculateOrganizationProgress } from './targetProgressEngine';
import type { SoulWinnerProfile } from '../types/auth';
import type { Target, TargetLevel } from '../types/target';

export interface OrphanEntityInfo {
  id: string;
  name: string;
  code: string;
  level: 'group' | 'church' | 'pcf';
  missingParentId: string;
  reason: string;
}

export interface OrganizationReconciliationReport {
  totalZones: number;
  totalGroups: number;
  totalChurches: number;
  totalPcfs: number;
  orphanGroups: OrphanEntityInfo[];
  orphanChurches: OrphanEntityInfo[];
  orphanPcfs: OrphanEntityInfo[];
  duplicateCodes: { code: string; count: number; entities: string[] }[];
  inactiveOrganizations: { id: string; name: string; level: string; code: string }[];
  isHealthy: boolean;
}

export interface UserReconciliationReport {
  totalUsers: number;
  activeCount: number;
  pendingCount: number;
  suspendedCount: number;
  disabledCount: number;
  unassignedSoulWinners: { uid: string; name: string; email: string }[];
  invalidPcfUsers: { uid: string; name: string; invalidPcfId: string }[];
  isHealthy: boolean;
}

export interface TargetReconciliationItem {
  id?: string;
  level: TargetLevel;
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
  target: number;
  actual: number;
  percentage: number;
  status: 'active' | 'target_not_set' | 'invalid_target' | 'inactive_org';
}

export interface TargetReconciliationReport {
  items: TargetReconciliationItem[];
  missingTargetsCount: number;
  zeroTargetsCount: number;
  invalidTargetsCount: number;
  inactiveOrgsWithTargetsCount: number;
  isHealthy: boolean;
}

/** Reconcile Organizational Hierarchy for orphans, duplicates, and inactive items */
export async function reconcileOrganizations(): Promise<OrganizationReconciliationReport> {
  const [zones, groups, churches, pcfs] = await Promise.all([
    getZones(),
    getGroups(),
    getChurches(),
    getPCFs(),
  ]);

  const zoneIds = new Set(zones.map((z) => z.id));
  const groupIds = new Set(groups.map((g) => g.id));
  const churchIds = new Set(churches.map((c) => c.id));

  const orphanGroups: OrphanEntityInfo[] = [];
  groups.forEach((g) => {
    if (!g.zoneId || !zoneIds.has(g.zoneId)) {
      orphanGroups.push({
        id: g.id,
        name: g.name,
        code: g.code,
        level: 'group',
        missingParentId: g.zoneId || '(empty)',
        reason: 'Parent Zone ID does not exist in active zones list.',
      });
    }
  });

  const orphanChurches: OrphanEntityInfo[] = [];
  churches.forEach((c) => {
    if (!c.groupId || !groupIds.has(c.groupId)) {
      orphanChurches.push({
        id: c.id,
        name: c.name,
        code: c.code,
        level: 'church',
        missingParentId: c.groupId || '(empty)',
        reason: 'Parent Group ID does not exist in active groups list.',
      });
    }
  });

  const orphanPcfs: OrphanEntityInfo[] = [];
  pcfs.forEach((p) => {
    if (!p.churchId || !churchIds.has(p.churchId)) {
      orphanPcfs.push({
        id: p.id,
        name: p.name,
        code: p.code,
        level: 'pcf',
        missingParentId: p.churchId || '(empty)',
        reason: 'Parent Church ID does not exist in active churches list.',
      });
    }
  });

  // Duplicate Code check
  const codeMap = new Map<string, string[]>();
  const addCode = (code: string, label: string) => {
    const cUpper = code.toUpperCase();
    const existing = codeMap.get(cUpper) || [];
    existing.push(label);
    codeMap.set(cUpper, existing);
  };

  zones.forEach((z) => addCode(z.code, `Zone: ${z.name}`));
  groups.forEach((g) => addCode(g.code, `Group: ${g.name}`));
  churches.forEach((c) => addCode(c.code, `Church: ${c.name}`));
  pcfs.forEach((p) => addCode(p.code, `PCF: ${p.name}`));

  const duplicateCodes: { code: string; count: number; entities: string[] }[] = [];
  codeMap.forEach((entities, code) => {
    if (entities.length > 1) {
      duplicateCodes.push({ code, count: entities.length, entities });
    }
  });

  // Inactive Org list
  const inactiveOrganizations: { id: string; name: string; level: string; code: string }[] = [];
  zones.filter((z) => z.status === 'inactive').forEach((z) => inactiveOrganizations.push({ id: z.id, name: z.name, level: 'Zone', code: z.code }));
  groups.filter((g) => g.status === 'inactive').forEach((g) => inactiveOrganizations.push({ id: g.id, name: g.name, level: 'Group', code: g.code }));
  churches.filter((c) => c.status === 'inactive').forEach((c) => inactiveOrganizations.push({ id: c.id, name: c.name, level: 'Church', code: c.code }));
  pcfs.filter((p) => p.status === 'inactive').forEach((p) => inactiveOrganizations.push({ id: p.id, name: p.name, level: 'PCF', code: p.code }));

  const isHealthy =
    orphanGroups.length === 0 &&
    orphanChurches.length === 0 &&
    orphanPcfs.length === 0 &&
    duplicateCodes.length === 0;

  return {
    totalZones: zones.length,
    totalGroups: groups.length,
    totalChurches: churches.length,
    totalPcfs: pcfs.length,
    orphanGroups,
    orphanChurches,
    orphanPcfs,
    duplicateCodes,
    inactiveOrganizations,
    isHealthy,
  };
}

/** Reconcile Users, Soul Winners, and assignment statuses */
export async function reconcileUsers(): Promise<UserReconciliationReport> {
  const [users, soulWinners, pcfs] = await Promise.all([
    getAllUsers(),
    getAllSoulWinnerProfiles(),
    getPCFs(),
  ]);

  const pcfIds = new Set(pcfs.map((p) => p.id));
  const swMap = new Map<string, SoulWinnerProfile>();
  soulWinners.forEach((sw) => swMap.set(sw.id || sw.userId, sw));

  let activeCount = 0;
  let pendingCount = 0;
  let suspendedCount = 0;
  let disabledCount = 0;

  const unassignedSoulWinners: { uid: string; name: string; email: string }[] = [];
  const invalidPcfUsers: { uid: string; name: string; invalidPcfId: string }[] = [];

  users.forEach((u) => {
    if (u.status === 'active') activeCount++;
    else if (u.status === 'pendingAssignment') pendingCount++;
    else if (u.status === 'suspended') suspendedCount++;
    else if (u.status === 'disabled') disabledCount++;

    if (u.role === 'soulWinner') {
      const sw = swMap.get(u.id);
      if (!sw || !sw.pcfId) {
        unassignedSoulWinners.push({ uid: u.id, name: u.name, email: u.email });
      } else if (!pcfIds.has(sw.pcfId)) {
        invalidPcfUsers.push({ uid: u.id, name: u.name, invalidPcfId: sw.pcfId });
      }
    }
  });

  const isHealthy = unassignedSoulWinners.length === 0 && invalidPcfUsers.length === 0;

  return {
    totalUsers: users.length,
    activeCount,
    pendingCount,
    suspendedCount,
    disabledCount,
    unassignedSoulWinners,
    invalidPcfUsers,
    isHealthy,
  };
}

/** Reconcile Target configurations across all organizational entities */
export async function reconcileTargets(): Promise<TargetReconciliationReport> {
  let records: any[] = [];
  try {
    records = await getAllLocalRecords();
  } catch (e) {
    records = [];
  }

  const [zones, groups, churches, pcfs, targets] = await Promise.all([
    getZones(),
    getGroups(),
    getChurches(),
    getPCFs(),
    getTargets(),
  ]);

  const targetMap = new Map<string, Target>();
  targets.forEach((t) => {
    if (t.status === 'active') {
      targetMap.set(`${t.level}_${t.organizationId}`, t);
    }
  });

  const items: TargetReconciliationItem[] = [];
  let missingTargetsCount = 0;
  let zeroTargetsCount = 0;
  let invalidTargetsCount = 0;
  let inactiveOrgsWithTargetsCount = 0;

  // Process Zones
  zones.forEach((z) => {
    const actual = records.filter((r) => r.zoneId === z.id).length;
    const tgt = targetMap.get(`zone_${z.id}`);
    const tVal = tgt ? tgt.target : 0;
    const prog = calculateOrganizationProgress({
      organizationId: z.id,
      organizationName: z.name,
      organizationCode: z.code,
      level: 'zone',
      actual,
      target: tVal,
    });

    let status: TargetReconciliationItem['status'] = 'active';
    if (z.status === 'inactive') {
      status = 'inactive_org';
      if (tgt) inactiveOrgsWithTargetsCount++;
    } else if (!tgt) {
      status = 'target_not_set';
      missingTargetsCount++;
    } else if (tVal === 0) {
      status = 'invalid_target';
      zeroTargetsCount++;
    }

    items.push({
      id: tgt?.id,
      level: 'zone',
      organizationId: z.id,
      organizationName: z.name,
      organizationCode: z.code,
      target: tVal,
      actual,
      percentage: prog.percentage,
      status,
    });
  });

  // Process Groups
  groups.forEach((g) => {
    const actual = records.filter((r) => r.groupId === g.id).length;
    const tgt = targetMap.get(`group_${g.id}`);
    const tVal = tgt ? tgt.target : 0;
    const prog = calculateOrganizationProgress({
      organizationId: g.id,
      organizationName: g.name,
      organizationCode: g.code,
      level: 'group',
      actual,
      target: tVal,
    });

    let status: TargetReconciliationItem['status'] = 'active';
    if (g.status === 'inactive') {
      status = 'inactive_org';
      if (tgt) inactiveOrgsWithTargetsCount++;
    } else if (!tgt) {
      status = 'target_not_set';
      missingTargetsCount++;
    } else if (tVal === 0) {
      status = 'invalid_target';
      zeroTargetsCount++;
    }

    items.push({
      id: tgt?.id,
      level: 'group',
      organizationId: g.id,
      organizationName: g.name,
      organizationCode: g.code,
      target: tVal,
      actual,
      percentage: prog.percentage,
      status,
    });
  });

  // Process Churches
  churches.forEach((c) => {
    const actual = records.filter((r) => r.churchId === c.id).length;
    const tgt = targetMap.get(`church_${c.id}`);
    const tVal = tgt ? tgt.target : 0;
    const prog = calculateOrganizationProgress({
      organizationId: c.id,
      organizationName: c.name,
      organizationCode: c.code,
      level: 'church',
      actual,
      target: tVal,
    });

    let status: TargetReconciliationItem['status'] = 'active';
    if (c.status === 'inactive') {
      status = 'inactive_org';
      if (tgt) inactiveOrgsWithTargetsCount++;
    } else if (!tgt) {
      status = 'target_not_set';
      missingTargetsCount++;
    } else if (tVal === 0) {
      status = 'invalid_target';
      zeroTargetsCount++;
    }

    items.push({
      id: tgt?.id,
      level: 'church',
      organizationId: c.id,
      organizationName: c.name,
      organizationCode: c.code,
      target: tVal,
      actual,
      percentage: prog.percentage,
      status,
    });
  });

  // Process PCFs
  pcfs.forEach((p) => {
    const actual = records.filter((r) => r.pcfId === p.id).length;
    const tgt = targetMap.get(`pcf_${p.id}`);
    const tVal = tgt ? tgt.target : 0;
    const prog = calculateOrganizationProgress({
      organizationId: p.id,
      organizationName: p.name,
      organizationCode: p.code,
      level: 'pcf',
      actual,
      target: tVal,
    });

    let status: TargetReconciliationItem['status'] = 'active';
    if (p.status === 'inactive') {
      status = 'inactive_org';
      if (tgt) inactiveOrgsWithTargetsCount++;
    } else if (!tgt) {
      status = 'target_not_set';
      missingTargetsCount++;
    } else if (tVal === 0) {
      status = 'invalid_target';
      zeroTargetsCount++;
    }

    items.push({
      id: tgt?.id,
      level: 'pcf',
      organizationId: p.id,
      organizationName: p.name,
      organizationCode: p.code,
      target: tVal,
      actual,
      percentage: prog.percentage,
      status,
    });
  });

  const isHealthy =
    missingTargetsCount === 0 &&
    zeroTargetsCount === 0 &&
    invalidTargetsCount === 0 &&
    inactiveOrgsWithTargetsCount === 0;

  return {
    items,
    missingTargetsCount,
    zeroTargetsCount,
    invalidTargetsCount,
    inactiveOrgsWithTargetsCount,
    isHealthy,
  };
}
