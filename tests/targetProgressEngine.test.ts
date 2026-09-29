import { describe, it, expect } from 'vitest';
import {
  calculateOrganizationProgress,
  calculateGroupRaceProgress,
} from '../src/services/targetProgressEngine';
import type { Group } from '../src/types/organization';
import type { Target } from '../src/types/target';

describe('Target + Progress Engine', () => {
  it('correctly calculates progress for normal achievement (650 / 1000 = 65%)', () => {
    const result = calculateOrganizationProgress({
      organizationId: 'grp1',
      organizationName: 'Grace Group',
      level: 'group',
      actual: 650,
      target: 1000,
    });

    expect(result.actual).toBe(650);
    expect(result.target).toBe(1000);
    expect(result.percentage).toBe(65);
    expect(result.normalizedProgress).toBe(0.65);
    expect(result.isTargetExceeded).toBe(false);
    expect(result.hasTarget).toBe(true);
    expect(result.displayPercentage).toBe('65%');
  });

  it('correctly handles target exceeded scenario (1120 / 1000 = 112%) without capping percentage', () => {
    const result = calculateOrganizationProgress({
      organizationId: 'grp2',
      organizationName: 'Faith Group',
      level: 'group',
      actual: 1120,
      target: 1000,
    });

    expect(result.actual).toBe(1120);
    expect(result.target).toBe(1000);
    expect(result.percentage).toBe(112);
    // Visual height caps at 1.0 (100%) so competitor reaches top finish line gracefully
    expect(result.normalizedProgress).toBe(1.0);
    expect(result.isTargetExceeded).toBe(true);
    expect(result.displayPercentage).toBe('112%');
  });

  it('gracefully handles missing or unconfigured targets', () => {
    const result = calculateOrganizationProgress({
      organizationId: 'grp3',
      organizationName: 'New Group',
      level: 'group',
      actual: 150,
      target: undefined,
    });

    expect(result.actual).toBe(150);
    expect(result.target).toBe(0);
    expect(result.hasTarget).toBe(false);
    expect(result.displayPercentage).toBe('TARGET NOT SET');
    expect(result.normalizedProgress).toBe(0);
  });

  it('calculates group race progress across multiple groups and sorts descending', () => {
    const groups: Group[] = [
      { id: 'g1', name: 'Group Alpha', code: 'GAL', groupId: 'g1', createdDate: '2026-01-01' },
      { id: 'g2', name: 'Group Beta', code: 'GBT', groupId: 'g2', createdDate: '2026-01-01' },
    ];

    const records = [
      { groupId: 'g1' },
      { groupId: 'g1' },
      { groupId: 'g1' },
      { groupId: 'g2' },
    ];

    const targets: Target[] = [
      {
        id: 't1',
        eventId: 'ron-2026',
        level: 'group',
        organizationId: 'g1',
        target: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        createdBy: 'admin',
        updatedBy: 'admin',
        status: 'active',
      },
      {
        id: 't2',
        eventId: 'ron-2026',
        level: 'group',
        organizationId: 'g2',
        target: 10,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        createdBy: 'admin',
        updatedBy: 'admin',
        status: 'active',
      },
    ];

    const raceData = calculateGroupRaceProgress(records, groups, targets);

    expect(raceData).toHaveLength(2);
    expect(raceData[0].organizationId).toBe('g1');
    expect(raceData[0].actual).toBe(3);
    expect(raceData[0].percentage).toBe(30);
    expect(raceData[1].organizationId).toBe('g2');
    expect(raceData[1].actual).toBe(1);
    expect(raceData[1].percentage).toBe(10);
  });
});
