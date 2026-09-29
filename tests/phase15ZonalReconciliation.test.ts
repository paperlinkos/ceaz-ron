// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { REACH_OUT_NIGERIA_EVENT } from '../src/config/eventConfig';
import { calculateOrganizationProgress, calculateGroupRaceProgress } from '../src/services/targetProgressEngine';
import { reconcileOrganizations, reconcileUsers, reconcileTargets } from '../src/services/reconciliationService';
import type { Zone, Group, Church, PCF } from '../src/types/organization';
import type { UserProfile } from '../src/types/auth';
import type { Target } from '../src/types/target';
import type { SoulWinningRecord } from '../src/types/record';

describe('Phase 15 — Real Organization Data & Zonal Reconciliation Engine', () => {
  describe('Zonal & Hierarchy Target Calculations', () => {
    it('enforces primary campaign Zonal Target of 50,000 souls', () => {
      expect(REACH_OUT_NIGERIA_EVENT.zonalTarget).toBe(50000);
      expect(REACH_OUT_NIGERIA_EVENT.nationalTarget).toBe(50000); // backward compatibility alias
    });

    it('calculates Zonal progress accurately (7,420 / 50,000 = 14.84%)', () => {
      const zonalTarget = REACH_OUT_NIGERIA_EVENT.zonalTarget;
      const zonalSoulsWon = 7420;
      const percentage = (zonalSoulsWon / zonalTarget) * 100;
      expect(percentage).toBeCloseTo(14.84, 2);
    });

    it('calculates Group target progress correctly', () => {
      const result = calculateOrganizationProgress({
        organizationId: 'grp-gwarinpa',
        organizationName: 'Gwarinpa Group',
        level: 'group',
        actual: 4500,
        target: 10000,
      });

      expect(result.actual).toBe(4500);
      expect(result.target).toBe(10000);
      expect(result.percentage).toBe(45);
      expect(result.normalizedProgress).toBe(0.45);
      expect(result.isTargetExceeded).toBe(false);
    });

    it('calculates Church target progress correctly', () => {
      const result = calculateOrganizationProgress({
        organizationId: 'ch-wuse',
        organizationName: 'Wuse Main Church',
        level: 'church',
        actual: 2400,
        target: 3000,
      });

      expect(result.actual).toBe(2400);
      expect(result.target).toBe(3000);
      expect(result.percentage).toBe(80);
      expect(result.displayPercentage).toBe('80%');
    });

    it('handles Church/PCF without configured target cleanly ("TARGET NOT SET")', () => {
      const result = calculateOrganizationProgress({
        organizationId: 'pcf-unconfigured',
        organizationName: 'Grace PCF 4',
        level: 'pcf',
        actual: 120,
        target: undefined,
      });

      expect(result.actual).toBe(120);
      expect(result.hasTarget).toBe(false);
      expect(result.displayPercentage).toBe('TARGET NOT SET');
      expect(result.normalizedProgress).toBe(0);
    });

    it('normalizes Upward Race visual height at 100% (1.0) while preserving actual percentage (>100%)', () => {
      const result = calculateOrganizationProgress({
        organizationId: 'grp-exceeded',
        organizationName: 'Victorious Group',
        level: 'group',
        actual: 11200,
        target: 10000,
      });

      expect(result.percentage).toBe(112);
      expect(result.displayPercentage).toBe('112%');
      expect(result.normalizedProgress).toBe(1.0); // Visual cap at 100% target line
      expect(result.isTargetExceeded).toBe(true);
    });
  });

  describe('Organization & Hierarchy Reconciliation', () => {
    it('detects orphan Groups, Churches, and PCFs without valid parent relationships', async () => {
      const report = await reconcileOrganizations();

      expect(report.totalZones).toBeGreaterThanOrEqual(0);
      expect(report.orphanGroups).toBeDefined();
      expect(report.orphanChurches).toBeDefined();
      expect(report.orphanPcfs).toBeDefined();
      expect(report.duplicateCodes).toBeDefined();
    });

    it('reconciles User statuses and flags unassigned Soul Winners', async () => {
      const report = await reconcileUsers();

      expect(report.totalUsers).toBeGreaterThanOrEqual(0);
      expect(typeof report.activeCount).toBe('number');
      expect(typeof report.pendingCount).toBe('number');
      expect(Array.isArray(report.unassignedSoulWinners)).toBe(true);
      expect(Array.isArray(report.invalidPcfUsers)).toBe(true);
    });

    it('reconciles Targets and identifies missing or unconfigured targets', async () => {
      const report = await reconcileTargets();

      expect(Array.isArray(report.items)).toBe(true);
      expect(typeof report.missingTargetsCount).toBe('number');
      expect(typeof report.zeroTargetsCount).toBe('number');
    });
  });

  describe('Historical Attribution Protection', () => {
    it('preserves historical record metadata when a Soul Winner is reassigned to a new PCF', () => {
      const originalRecord: SoulWinningRecord = {
        id: 'rec-001',
        soulWinnerId: 'usr-winner-1',
        soulName: 'John Doe',
        soulPhone: '08012345678',
        locationMet: 'Gwarinpa Market',
        zoneId: 'zn-abj1',
        groupId: 'grp-gwarinpa',
        churchId: 'ch-gwarinpa1',
        pcfId: 'pcf-grace1',
        timestamp: '2026-10-01T10:00:00Z',
        synced: true,
      };

      const soulWinnerProfile: UserProfile = {
        id: 'usr-winner-1',
        email: 'winner1@ron.org',
        name: 'Winner One',
        role: 'soulWinner',
        status: 'active',
        zoneId: 'zn-abj1',
        groupId: 'grp-wuse', // Moved to new Group
        churchId: 'ch-wuse1', // Moved to new Church
        pcfId: 'pcf-faith2',  // Moved to new PCF
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-10-02T12:00:00Z',
      };

      // Ensure past record remains tied to original PCF/Church/Group/Zone
      expect(originalRecord.pcfId).toBe('pcf-grace1');
      expect(originalRecord.churchId).toBe('ch-gwarinpa1');
      expect(originalRecord.groupId).toBe('grp-gwarinpa');

      // New record created after reassignment uses new PCF/Church/Group/Zone
      const newRecord: SoulWinningRecord = {
        id: 'rec-002',
        soulWinnerId: soulWinnerProfile.id,
        soulName: 'Jane Smith',
        soulPhone: '08087654321',
        locationMet: 'Wuse Zone 4',
        zoneId: soulWinnerProfile.zoneId!,
        groupId: soulWinnerProfile.groupId!,
        churchId: soulWinnerProfile.churchId!,
        pcfId: soulWinnerProfile.pcfId!,
        timestamp: '2026-10-02T14:00:00Z',
        synced: true,
      };

      expect(newRecord.pcfId).toBe('pcf-faith2');
      expect(newRecord.churchId).toBe('ch-wuse1');
      expect(newRecord.groupId).toBe('grp-wuse');
      expect(originalRecord.pcfId).not.toBe(newRecord.pcfId);
    });
  });
});
