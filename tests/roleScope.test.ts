import { describe, it, expect } from 'vitest';
import { getUserScope, isAuthorizedForOrg } from '../src/services/roleScopeService';
import type { UserProfile, SoulWinnerProfile } from '../src/types/auth';
import type { Group, Church, PCF } from '../src/types/organization';

describe('Role Scope & Dashboard Authorization', () => {
  const groups: Group[] = [
    { id: 'g_alpha', name: 'Group Alpha', code: 'GAL', zoneId: 'z1', createdDate: '2026-01-01' },
    { id: 'g_beta', name: 'Group Beta', code: 'GBT', zoneId: 'z1', createdDate: '2026-01-01' },
  ];

  const churches: Church[] = [
    { id: 'c_kbs', name: 'CE KBS', code: 'CKBS', groupId: 'g_alpha', createdDate: '2026-01-01' },
    { id: 'c_zuba', name: 'CE Zuba', code: 'CZUB', groupId: 'g_beta', createdDate: '2026-01-01' },
  ];

  const pcfs: PCF[] = [
    { id: 'p_grace', name: 'Grace PCF', code: 'PGRC', churchId: 'c_kbs', createdDate: '2026-01-01' },
    { id: 'p_faith', name: 'Faith PCF', code: 'PFTH', churchId: 'c_zuba', createdDate: '2026-01-01' },
  ];

  it('correctly determines user scope based on profile role and assigned organization', () => {
    const groupPastorProfile: UserProfile = {
      id: 'usr_pastor_john',
      name: 'Pastor John',
      email: 'john@ceaz1.org',
      phone: '08012345678',
      role: 'groupManager',
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const groupPastorWinner: SoulWinnerProfile = {
      id: 'usr_pastor_john',
      userId: 'usr_pastor_john',
      groupId: 'g_alpha',
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const scope = getUserScope(groupPastorProfile, groupPastorWinner);

    expect(scope.role).toBe('groupManager');
    expect(scope.level).toBe('group');
    expect(scope.orgId).toBe('g_alpha');
    expect(scope.isSuperAdmin).toBe(false);
  });

  it('allows Group Pastor to view their assigned Group and child Churches under their Group', () => {
    const scope = getUserScope(
      {
        id: 'u1',
        name: 'Pastor Alpha',
        email: 'alpha@ce.org',
        phone: '08011111111',
        role: 'groupManager',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
      { id: 'u1', userId: 'u1', groupId: 'g_alpha', status: 'active', createdAt: '', updatedAt: '' }
    );

    // Can access own group
    expect(isAuthorizedForOrg(scope, 'g_alpha', 'group', groups, churches, pcfs)).toBe(true);

    // Can access child church under Group Alpha
    expect(isAuthorizedForOrg(scope, 'c_kbs', 'church', groups, churches, pcfs)).toBe(true);

    // Can access child PCF under Church CE KBS
    expect(isAuthorizedForOrg(scope, 'p_grace', 'pcf', groups, churches, pcfs)).toBe(true);
  });

  it('REJECTS Group Pastor attempting to view an unrelated Group or Church outside their scope', () => {
    const scope = getUserScope(
      {
        id: 'u1',
        name: 'Pastor Alpha',
        email: 'alpha@ce.org',
        phone: '08011111111',
        role: 'groupManager',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
      { id: 'u1', userId: 'u1', groupId: 'g_alpha', status: 'active', createdAt: '', updatedAt: '' }
    );

    // CANNOT access Group Beta
    expect(isAuthorizedForOrg(scope, 'g_beta', 'group', groups, churches, pcfs)).toBe(false);

    // CANNOT access CE Zuba (under Group Beta)
    expect(isAuthorizedForOrg(scope, 'c_zuba', 'church', groups, churches, pcfs)).toBe(false);

    // CANNOT access Faith PCF (under Group Beta)
    expect(isAuthorizedForOrg(scope, 'p_faith', 'pcf', groups, churches, pcfs)).toBe(false);
  });

  it('allows SuperAdmin to view any organization level and ID', () => {
    const adminScope = getUserScope({
      id: 'admin',
      name: 'Super Admin',
      email: 'admin@ce.org',
      phone: '08099999999',
      role: 'superAdmin',
      status: 'active',
      createdAt: '',
      updatedAt: '',
    });

    expect(isAuthorizedForOrg(adminScope, 'g_beta', 'group', groups, churches, pcfs)).toBe(true);
    expect(isAuthorizedForOrg(adminScope, 'c_zuba', 'church', groups, churches, pcfs)).toBe(true);
    expect(isAuthorizedForOrg(adminScope, 'p_faith', 'pcf', groups, churches, pcfs)).toBe(true);
  });
});
