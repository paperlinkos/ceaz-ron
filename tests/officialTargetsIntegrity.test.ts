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
  it('covers all 24 default groups with their exact individual targets from the PDF', () => {
    expect(DEFAULT_GROUPS.length).toBe(24);

    DEFAULT_GROUPS.forEach((group) => {
      const target = getOfficialTarget('group', group.id);
      expect(target).toBeDefined();
      expect(target).toBeGreaterThan(0);
    });
  });

  it('covers all default churches with their distinct individual targets from the PDF', () => {
    expect(DEFAULT_CHURCHES.length).toBe(129);

    // Every single church in DEFAULT_CHURCHES must have an official target mapped
    DEFAULT_CHURCHES.forEach((church) => {
      const target = getOfficialTarget('church', church.id);
      expect(target).toBeDefined();
      expect(target).toBeGreaterThan(0);
    });
  });

  it('mergeTargetsWithDefaults preserves all official PDF targets when custom target list is empty', () => {
    const merged = mergeTargetsWithDefaults([]);
    expect(merged.length).toBeGreaterThanOrEqual(129);

    const kubwa1 = merged.find((t) => t.level === 'group' && t.organizationId === 'grp-kubwa-1');
    expect(kubwa1?.target).toBe(3500);

    const gwarinpaChurch = merged.find((t) => t.level === 'church' && t.organizationId === 'ch-ce-gwarinpa-1');
    expect(gwarinpaChurch?.target).toBe(1500);

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

    expect(kubwaProgress?.target).toBe(3500);
    expect(karmoProgress?.target).toBe(1000);
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

    expect(gwarinpaProgress?.target).toBe(1500);
    expect(kbs2Progress?.target).toBe(30);
  });
});
