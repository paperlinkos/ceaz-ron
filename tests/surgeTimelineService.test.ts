import { describe, it, expect } from 'vitest';
import {
  aggregateRecordsIntoTimeline,
  generateCampaignDaySimulation,
  formatHourLabel,
} from '../src/services/surgeTimelineService';
import type { SoulWinningRecord } from '../src/types/record';

describe('Surge Timeline & Line Graph Engine', () => {
  it('handles empty records cleanly', () => {
    const res = aggregateRecordsIntoTimeline([]);
    expect(res.buckets).toHaveLength(0);
    expect(res.totalSouls).toBe(0);
    expect(res.peakBucket).toBeNull();
  });

  it('aggregates records into hourly buckets and computes running cumulative totals', () => {
    const base = new Date('2026-10-01T08:00:00.000Z').getTime();

    const records: SoulWinningRecord[] = [
      {
        id: '1',
        name: 'Soul 1',
        phone: '08012345678',
        location: 'Wuse Market',
        groupName: 'Gwarinpa Group',
        churchName: 'CE Gwarinpa 1',
        createdAt: new Date(base).toISOString(),
        clientCreatedAt: new Date(base).toISOString(),
        syncStatus: 'synced',
        isBornAgain: true,
      },
      {
        id: '2',
        name: 'Soul 2',
        phone: '08012345679',
        location: 'Wuse Market',
        groupName: 'Gwarinpa Group',
        churchName: 'CE Gwarinpa 1',
        createdAt: new Date(base + 10 * 60 * 1000).toISOString(), // 8:10
        clientCreatedAt: new Date(base + 10 * 60 * 1000).toISOString(),
        syncStatus: 'synced',
        isBornAgain: true,
      },
      // Massive surge at 10:00 AM (+5 souls)
      ...Array.from({ length: 5 }).map((_, i) => ({
        id: `surge-${i}`,
        name: `Surge Soul ${i}`,
        phone: `0809999000${i}`,
        location: 'Banex Plaza',
        groupName: 'Dawaki Sub-Group',
        churchName: 'CE Dawaki',
        createdAt: new Date(base + 2 * 3600 * 1000 + i * 60000).toISOString(), // 10:00+
        clientCreatedAt: new Date(base + 2 * 3600 * 1000 + i * 60000).toISOString(),
        syncStatus: 'synced' as const,
        isBornAgain: true,
      })),
    ];

    const result = aggregateRecordsIntoTimeline(records, 60);

    expect(result.totalSouls).toBe(7);
    expect(result.buckets.length).toBeGreaterThanOrEqual(3);

    // Verify peak spike is detected
    expect(result.peakBucket).toBeDefined();
    expect(result.peakBucket?.soulsCount).toBe(5);
    expect(result.peakBucket?.isSpike).toBe(true);
    expect(result.peakBucket?.spikeIntensity).toBe('peak');

    // Verify root cause attributes
    expect(result.peakBucket?.spikeCause.primaryGroup).toBe('Dawaki Sub-Group');
    expect(result.peakBucket?.spikeCause.primaryChurch).toBe('CE Dawaki');
    expect(result.peakBucket?.spikeCause.topLocations[0].location).toBe('Banex Plaza');
  });

  it('generates a rich multi-surge simulation timeline for demonstration preview', () => {
    const simRecords = generateCampaignDaySimulation();
    expect(simRecords.length).toBeGreaterThan(500);

    const timeline = aggregateRecordsIntoTimeline(simRecords, 60);
    expect(timeline.totalSouls).toBe(simRecords.length);
    expect(timeline.peakBucket).not.toBeNull();
    expect(timeline.peakBucket?.soulsCount).toBeGreaterThanOrEqual(100);
    expect(timeline.topSurgeCauses.length).toBeGreaterThan(0);
  });
});
