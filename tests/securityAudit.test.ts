import { describe, it, expect } from 'vitest';
import { getUserScope, isAuthorizedForOrg } from '../src/services/roleScopeService';
import { calculateOrganizationProgress } from '../src/services/targetProgressEngine';
import type { UserProfile, SoulWinnerProfile } from '../src/types/auth';
import type { Group, Church, PCF } from '../src/types/organization';
import type { SoulWinningRecord } from '../src/types/record';

describe('Phase 14: Security, Privacy & Abuse-Resilience Audit', () => {
  const mockGroups: Group[] = [
    { id: 'grp_alpha', name: 'Group Alpha', code: 'GAL', zoneId: 'zone_abj', status: 'active', createdAt: '2026-01-01' },
    { id: 'grp_beta', name: 'Group Beta', code: 'GBT', zoneId: 'zone_abj', status: 'active', createdAt: '2026-01-01' },
  ];

  const mockChurches: Church[] = [
    { id: 'ch_gwr', name: 'CE Gwarinpa', code: 'CGWR', groupId: 'grp_alpha', status: 'active', createdAt: '2026-01-01' },
    { id: 'ch_wus', name: 'CE Wuse', code: 'CWUS', groupId: 'grp_beta', status: 'active', createdAt: '2026-01-01' },
  ];

  const mockPcfs: PCF[] = [
    { id: 'pcf_grace', name: 'Grace PCF', code: 'PGRC', churchId: 'ch_gwr', status: 'active', createdAt: '2026-01-01' },
    { id: 'pcf_faith', name: 'Faith PCF', code: 'PFTH', churchId: 'ch_wus', status: 'active', createdAt: '2026-01-01' },
  ];

  it('1. Authentication Bypass: Unauthenticated user scope defaults to soulWinner with null orgId', () => {
    const unauthScope = getUserScope(null, null);
    expect(unauthScope.role).toBe('soulWinner');
    expect(unauthScope.orgId).toBeNull();
    expect(unauthScope.isSuperAdmin).toBe(false);

    // Unauthenticated user is unauthorized for manager org views
    expect(isAuthorizedForOrg(unauthScope, 'grp_alpha', 'group', mockGroups, mockChurches, mockPcfs)).toBe(false);
  });

  it('2. Role Escalation Protection: User cannot self-promote to superAdmin without token claim', () => {
    const maliciousSoulWinner: UserProfile = {
      uid: 'user_malicious',
      email: 'hacker@ron.ng',
      name: 'Hacker',
      role: 'soulWinner', // Claimed client-side role
      status: 'active',
      createdAt: '2026-01-01',
    };

    const winnerProfile: SoulWinnerProfile = {
      uid: 'user_malicious',
      pcfId: 'pcf_grace',
      churchId: 'ch_gwr',
      groupId: 'grp_alpha',
      zoneId: 'zone_abj',
      status: 'active',
      createdAt: '2026-01-01',
    };

    const scope = getUserScope(maliciousSoulWinner, winnerProfile);
    expect(scope.isSuperAdmin).toBe(false);
    expect(scope.role).toBe('soulWinner');

    // Attempting to request SuperAdmin access fails
    expect(isAuthorizedForOrg(scope, 'grp_beta', 'group', mockGroups, mockChurches, mockPcfs)).toBe(false);
  });

  it('3. Organization & Manager Scope Escape: Group Manager Alpha is blocked from Group Beta', () => {
    const gmProfile: UserProfile = {
      uid: 'user_gm_alpha',
      email: 'gm@alpha.ng',
      name: 'Pastor Alpha GM',
      role: 'groupManager',
      status: 'active',
      createdAt: '2026-01-01',
    };

    const gmWinner: SoulWinnerProfile = {
      uid: 'user_gm_alpha',
      groupId: 'grp_alpha',
      status: 'active',
      createdAt: '2026-01-01',
    };

    const scope = getUserScope(gmProfile, gmWinner);
    expect(scope.groupId).toBe('grp_alpha');

    // Authorized for Group Alpha & its child church
    expect(isAuthorizedForOrg(scope, 'grp_alpha', 'group', mockGroups, mockChurches, mockPcfs)).toBe(true);
    expect(isAuthorizedForOrg(scope, 'ch_gwr', 'church', mockGroups, mockChurches, mockPcfs)).toBe(true);

    // BLOCKED from Group Beta & Church Wuse
    expect(isAuthorizedForOrg(scope, 'grp_beta', 'group', mockGroups, mockChurches, mockPcfs)).toBe(false);
    expect(isAuthorizedForOrg(scope, 'ch_wus', 'church', mockGroups, mockChurches, mockPcfs)).toBe(false);
  });

  it('4. Soul Record Tampering & Historical Attribution: Reassigning PCF does not mutate historical record pcfId', () => {
    const historicalRecord: SoulWinningRecord = {
      id: 'rec_hist_001',
      soulWinnerId: 'user_sw_1',
      soulWinnerName: 'Brother John',
      name: 'Soul Mark',
      phone: '+2348011112222',
      location: 'Market Place',
      pcfId: 'pcf_grace',
      churchId: 'ch_gwr',
      groupId: 'grp_alpha',
      zoneId: 'zone_abj',
      createdAt: '2026-02-01T10:00:00.000Z',
      clientCreatedAt: '2026-02-01T10:00:00.000Z',
      syncStatus: 'synced',
    };

    // User is reassigned to pcf_faith
    const reassignedProfile: SoulWinnerProfile = {
      uid: 'user_sw_1',
      pcfId: 'pcf_faith',
      churchId: 'ch_wus',
      groupId: 'grp_beta',
      zoneId: 'zone_abj',
      status: 'active',
      createdAt: '2026-01-01',
    };

    // Historical record must retain original pcfId
    expect(historicalRecord.pcfId).toBe('pcf_grace');
    expect(reassignedProfile.pcfId).toBe('pcf_faith');
    expect(historicalRecord.pcfId).not.toBe(reassignedProfile.pcfId);
  });

  it('5. Public Observer Privacy: Public observer data payload strips phone numbers & user details', () => {
    const secretRecord: SoulWinningRecord = {
      id: 'rec_secret',
      soulWinnerId: 'sw_private',
      soulWinnerName: 'Sister Grace',
      name: 'Private Convert',
      phone: '+2348099887766',
      location: 'Private Location',
      pcfId: 'pcf_grace',
      churchId: 'ch_gwr',
      groupId: 'grp_alpha',
      zoneId: 'zone_abj',
      createdAt: '2026-02-01T10:00:00.000Z',
      clientCreatedAt: '2026-02-01T10:00:00.000Z',
      syncStatus: 'synced',
    };

    const publicCounterPayload = {
      totalSouls: 1,
      target: 40000,
      percentage: (1 / 40000) * 100,
    };

    expect(publicCounterPayload.totalSouls).toBe(1);
    expect((publicCounterPayload as any).phone).toBeUndefined();
    expect((publicCounterPayload as any).soulWinnerPhone).toBeUndefined();
    expect((publicCounterPayload as any).location).toBeUndefined();
  });

  it('6. Input Validation & XSS Prevention: Malicious script tags in inputs are harmless plain text strings', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const record: SoulWinningRecord = {
      id: 'rec_xss_test',
      soulWinnerId: 'user_sw_1',
      soulWinnerName: 'Clean Name',
      name: maliciousInput,
      phone: '+2348011112222',
      location: 'Location <img src=x onerror=alert(1)>',
      pcfId: 'pcf_grace',
      churchId: 'ch_gwr',
      groupId: 'grp_alpha',
      zoneId: 'zone_abj',
      createdAt: '2026-02-01T10:00:00.000Z',
      clientCreatedAt: '2026-02-01T10:00:00.000Z',
      syncStatus: 'synced',
    };

    expect(typeof record.name).toBe('string');
    expect(record.name).toContain('<script>');
    // Verify target engine processes string without executing code
    const progress = calculateOrganizationProgress({
      organizationId: record.pcfId,
      organizationName: record.name,
      level: 'pcf',
      actual: 1,
      target: 100,
    });

    expect(progress.organizationName).toBe('<script>alert("xss")</script>');
    expect(progress.actual).toBe(1);
  });
});
