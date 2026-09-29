// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { REACH_OUT_NIGERIA_EVENT } from '../src/config/eventConfig';
import { validateOrganizationCSV, validateSoulWinnerCSV } from '../src/services/bulkImportService';
import { reconcileOrganizations, reconcileUsers, reconcileTargets } from '../src/services/reconciliationService';
import { ENVIRONMENT_TYPE, CURRENT_PROJECT_ID } from '../src/services/firebase';

describe('Phase 17 — Production Data Configuration & Reconciliation Engine', () => {
  describe('Zonal Campaign Terminology Audit', () => {
    it('enforces Zonal Target of 50,000 souls without National campaign scope terminology', () => {
      expect(REACH_OUT_NIGERIA_EVENT.zonalTarget).toBe(50000);
      expect(REACH_OUT_NIGERIA_EVENT.name).toBe('Reach Out Nigeria');
    });

    it('verifies Environment Type is identified cleanly', () => {
      expect(['PRODUCTION', 'DEVELOPMENT']).toContain(ENVIRONMENT_TYPE);
      expect(typeof CURRENT_PROJECT_ID).toBe('string');
    });
  });

  describe('Bulk Import Validation Workflow', () => {
    it('validates Organization CSV and derives preview counts without writing to database', async () => {
      const sampleOrgCSV = `zoneName,zoneCode,groupName,groupCode,churchName,churchCode,pcfName,pcfCode
Abuja Zone 1,ZN-ABJ1,Gwarinpa Group,GRP-GWR,CE Gwarinpa 1,CH-GWR1,Grace PCF,PCF-GRC`;

      const result = await validateOrganizationCSV(sampleOrgCSV);

      expect(result.errors.length).toBe(0);
      expect(result.totalRows).toBe(1);
      expect(result.validRowsCount).toBe(1);
      expect(result.preview.zonesNew).toBe(1);
      expect(result.preview.groupsNew).toBe(1);
      expect(result.preview.churchesNew).toBe(1);
      expect(result.preview.pcfsNew).toBe(1);
    });

    it('validates Soul Winner CSV and enforces PCF existence validation', async () => {
      const sampleSoulCSV = `name,email,pcfCode
Brother Mark,mark@example.com,PCF-UNKNOWN`;

      const result = await validateSoulWinnerCSV(sampleSoulCSV);

      expect(result.totalRows).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('PCF');
    });
  });

  describe('Administrative Reconciliation Engine Integration', () => {
    it('runs Organization Reconciliation without errors', async () => {
      const report = await reconcileOrganizations();
      expect(report.totalZones).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.orphanGroups)).toBe(true);
      expect(Array.isArray(report.duplicateCodes)).toBe(true);
    });

    it('runs User Reconciliation without errors', async () => {
      const report = await reconcileUsers();
      expect(report.totalUsers).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.unassignedSoulWinners)).toBe(true);
    });

    it('runs Target Reconciliation without errors', async () => {
      const report = await reconcileTargets();
      expect(Array.isArray(report.items)).toBe(true);
      expect(typeof report.missingTargetsCount).toBe('number');
    });
  });
});
