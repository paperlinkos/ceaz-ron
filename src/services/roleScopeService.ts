import type { UserProfile, SoulWinnerProfile } from '../types/auth';
import type { TargetLevel } from '../types/target';
import type { Group, Church, PCF } from '../types/organization';

export interface UserScope {
  role: UserProfile['role'];
  level: TargetLevel | 'soulWinner';
  orgId: string | null;
  zoneId?: string;
  groupId?: string;
  churchId?: string;
  pcfId?: string;
  isSuperAdmin: boolean;
}

/** Determines the highest organizational scope authorized for a given user profile & soul winner record */
export function getUserScope(
  profile: UserProfile | null,
  soulWinner?: SoulWinnerProfile | null
): UserScope {
  if (!profile) {
    return {
      role: 'soulWinner',
      level: 'soulWinner',
      orgId: null,
      isSuperAdmin: false,
    };
  }

  if (profile.role === 'superAdmin') {
    return {
      role: 'superAdmin',
      level: 'zone',
      orgId: soulWinner?.zoneId || 'default_zone',
      zoneId: soulWinner?.zoneId,
      groupId: soulWinner?.groupId,
      churchId: soulWinner?.churchId,
      pcfId: soulWinner?.pcfId,
      isSuperAdmin: true,
    };
  }

  if (profile.role === 'zoneManager' && soulWinner?.zoneId) {
    return {
      role: 'zoneManager',
      level: 'zone',
      orgId: soulWinner.zoneId,
      zoneId: soulWinner.zoneId,
      isSuperAdmin: false,
    };
  }

  if (profile.role === 'groupManager' && soulWinner?.groupId) {
    return {
      role: 'groupManager',
      level: 'group',
      orgId: soulWinner.groupId,
      zoneId: soulWinner.zoneId,
      groupId: soulWinner.groupId,
      isSuperAdmin: false,
    };
  }

  if (profile.role === 'churchManager' && soulWinner?.churchId) {
    return {
      role: 'churchManager',
      level: 'church',
      orgId: soulWinner.churchId,
      zoneId: soulWinner.zoneId,
      groupId: soulWinner.groupId,
      churchId: soulWinner.churchId,
      isSuperAdmin: false,
    };
  }

  if (profile.role === 'pcfLeader' && soulWinner?.pcfId) {
    return {
      role: 'pcfLeader',
      level: 'pcf',
      orgId: soulWinner.pcfId,
      zoneId: soulWinner.zoneId,
      groupId: soulWinner.groupId,
      churchId: soulWinner.churchId,
      pcfId: soulWinner.pcfId,
      isSuperAdmin: false,
    };
  }

  return {
    role: 'soulWinner',
    level: 'soulWinner',
    orgId: profile.id,
    zoneId: soulWinner?.zoneId,
    groupId: soulWinner?.groupId,
    churchId: soulWinner?.churchId,
    pcfId: soulWinner?.pcfId,
    isSuperAdmin: false,
  };
}

/**
 * Validates whether a user scope is authorized to view a target organization ID and level.
 */
export function isAuthorizedForOrg(
  userScope: UserScope,
  targetOrgId: string,
  targetLevel: TargetLevel,
  groups: Group[],
  churches: Church[],
  pcfs: PCF[]
): boolean {
  if (userScope.isSuperAdmin) return true;
  if (!userScope.orgId) return false;

  // Same org level & ID match
  if (userScope.level === targetLevel && userScope.orgId === targetOrgId) {
    return true;
  }

  // Zone Manager can view any Group/Church/PCF in their zone
  if (userScope.level === 'zone') {
    if (targetLevel === 'group') {
      const g = groups.find((grp) => grp.id === targetOrgId);
      return g?.zoneId === userScope.orgId;
    }
    if (targetLevel === 'church') {
      const c = churches.find((ch) => ch.id === targetOrgId);
      const parentGroup = groups.find((grp) => grp.id === c?.groupId);
      return parentGroup?.zoneId === userScope.orgId;
    }
    if (targetLevel === 'pcf') {
      const p = pcfs.find((pcfItem) => pcfItem.id === targetOrgId);
      const parentChurch = churches.find((ch) => ch.id === p?.churchId);
      const parentGroup = groups.find((grp) => grp.id === parentChurch?.groupId);
      return parentGroup?.zoneId === userScope.orgId;
    }
  }

  // Group Manager can view Churches & PCFs in their assigned group
  if (userScope.level === 'group') {
    if (targetLevel === 'church') {
      const c = churches.find((ch) => ch.id === targetOrgId);
      return c?.groupId === userScope.orgId;
    }
    if (targetLevel === 'pcf') {
      const p = pcfs.find((pcfItem) => pcfItem.id === targetOrgId);
      const parentChurch = churches.find((ch) => ch.id === p?.churchId);
      return parentChurch?.groupId === userScope.orgId;
    }
  }

  // Church Manager can view PCFs in their assigned church
  if (userScope.level === 'church') {
    if (targetLevel === 'pcf') {
      const p = pcfs.find((pcfItem) => pcfItem.id === targetOrgId);
      return p?.churchId === userScope.orgId;
    }
  }

  return false;
}
