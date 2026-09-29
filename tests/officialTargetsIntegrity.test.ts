import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_TARGET_MAP,
  getOfficialTarget,
  getDefaultInitialTargets,
  mergeTargetsWithDefaults,
} from '../src/services/targetService';
import { DEFAULT_GROUPS, DEFAULT_CHURCHES } from '../src/services/organizationService';
import { calculateGroupRaceProgress, calculateChurchRaceProgress } from '../src/services/targetProgressEngine';

describe('Official PDF Targets Integrity & Logic Verification', () => {
  it('covers all 20 default groups with their exact individual targets from the PDF', () => {
    expect(DEFAULT_GROUPS.length).toBe(20);

    const expectedGroupTargets: Record<string, number> = {
      'grp-wuye-1': 1000,
      'grp-wuye-2': 1000,
      'grp-karmo': 500,
      'grp-gwarinpa': 2000,
      'grp-fruitful-vine': 500,
      'grp-kubwa-1': 3000,
      'grp-kubwa-2': 500,
      'grp-bwari': 2000,
      'grp-new-horizon': 2000,
      'grp-gwagwalada-1': 2000,
      'grp-gwagwalada-2': 2000,
      'grp-kuje': 2000,
      'grp-lokogoma': 2000,
      'grp-dei-dei': 2000,
      'grp-airport-road': 1000,
      'grp-dutse-makaranta': 1000,
      'grp-city-church': 1000,
      'grp-teens-church': 1500,
      'grp-zonal-church': 1000,
      'grp-standalone': 1000,
    };

    DEFAULT_GROUPS.forEach((group) => {
      const target = getOfficialTarget('group', group.id);
      expect(target).toBeDefined();
      expect(target).toBe(expectedGroupTargets[group.id]);
    });
  });

  it('covers all default churches with their distinct individual targets from the PDF', () => {
    expect(DEFAULT_CHURCHES.length).toBe(98);

    // Key sample checks across different groups
    const sampleChurches: Record<string, number> = {
      'ch-ce-kbs': 400,
      'ch-ce-lighthouse': 280,
      'ch-ce-koinonia': 260,
      'ch-ce-kbs-2': 30,
      'ch-ce-express': 530,
      'ch-ce-livingspring': 240,
      'ch-ce-pacesetters': 230,
      'ch-ce-karmo': 330,
      'ch-ce-dape': 20,
      'ch-ce-kagini': 130,
      'ch-ce-gwarinpa-1': 1350,
      'ch-ce-precious-place': 260,
      'ch-ce-word-arena': 110,
      'ch-ce-kubwa': 1550,
      'ch-ce-katampe-ext': 500,
      'ch-ce-bwari-main': 1000,
      'ch-ce-ushafa': 1350,
      'ch-ce-gwagwalada-1': 1000,
      'ch-ce-tunga-maje': 750,
      'ch-ce-gwagwalada-2': 1000,
      'ch-ce-kuje': 880,
      'ch-ce-kuje-2': 380,
      'ch-ce-lokogoma': 1100,
      'ch-ce-deidei-2': 2000,
      'ch-ce-dutse-makaranta': 740,
      'ch-ce-airport-road': 420,
      'ch-ce-city-church': 1000,
      'ch-teens-church': 1500,
      'ch-service-1': 500,
      'ch-service-2': 500,
      'ch-ce-byazhin': 500,
      'ch-ce-wealthy-place': 500,
    };

    Object.entries(sampleChurches).forEach(([churchId, expectedTarget]) => {
      const target = getOfficialTarget('church', churchId);
      expect(target).toBe(expectedTarget);
    });

    // Every single church in DEFAULT_CHURCHES must have an official target mapped
    DEFAULT_CHURCHES.forEach((church) => {
      const target = getOfficialTarget('church', church.id);
      expect(target).toBeDefined();
      expect(target).toBeGreaterThan(0);
    });
  });

  it('mergeTargetsWithDefaults preserves all official PDF targets when custom target list is empty', () => {
    const merged = mergeTargetsWithDefaults([]);
    expect(merged.length).toBeGreaterThanOrEqual(118);

    const kubwa1 = merged.find((t) => t.level === 'group' && t.organizationId === 'grp-kubwa-1');
    expect(kubwa1?.target).toBe(3000);

    const gwarinpaChurch = merged.find((t) => t.level === 'church' && t.organizationId === 'ch-ce-gwarinpa-1');
    expect(gwarinpaChurch?.target).toBe(1350);

    const deideiChurch = merged.find((t) => t.level === 'church' && t.organizationId === 'ch-ce-deidei-2');
    expect(deideiChurch?.target).toBe(2000);
  });

  it('calculateGroupRaceProgress uses the distinct target for each group', () => {
    const mockRecords = [
      { groupId: 'grp-kubwa-1' },
      { groupId: 'grp-kubwa-1' },
      { groupId: 'grp-karmo' },
    ];

    const results = calculateGroupRaceProgress(mockRecords, DEFAULT_GROUPS, []);
    const kubwaProgress = results.find((r) => r.organizationId === 'grp-kubwa-1');
    const karmoProgress = results.find((r) => r.organizationId === 'grp-karmo');

    expect(kubwaProgress?.target).toBe(3000);
    expect(karmoProgress?.target).toBe(500);
    expect(kubwaProgress?.actual).toBe(2);
    expect(karmoProgress?.actual).toBe(1);
  });

  it('calculateChurchRaceProgress uses the distinct target for each church', () => {
    const mockRecords = [
      { churchId: 'ch-ce-gwarinpa-1' },
      { churchId: 'ch-ce-gwarinpa-1' },
      { churchId: 'ch-ce-kbs-2' },
    ];

    const results = calculateChurchRaceProgress(mockRecords, DEFAULT_CHURCHES, []);
    const gwarinpaProgress = results.find((r) => r.organizationId === 'ch-ce-gwarinpa-1');
    const kbs2Progress = results.find((r) => r.organizationId === 'ch-ce-kbs-2');

    expect(gwarinpaProgress?.target).toBe(1350);
    expect(kbs2Progress?.target).toBe(30);
  });
});
