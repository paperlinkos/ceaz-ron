import type { SoulWinningRecord } from '../types/record';

export interface TimelineBucket {
  id: string;
  timeLabel: string;
  timestamp: number;
  soulsCount: number;
  cumulativeSouls: number;
  isSpike: boolean;
  spikeIntensity: 'none' | 'moderate' | 'high' | 'peak';
  spikeCause: {
    primaryGroup: string;
    primaryGroupCount: number;
    primaryGroupPercentage: number;
    primaryChurch: string;
    primaryChurchCount: number;
    topLocations: Array<{ location: string; count: number }>;
    topSoulWinners: Array<{ name: string; count: number }>;
    bornAgainCount: number;
    holySpiritCount: number;
    headline: string;
  };
  records: SoulWinningRecord[];
  groupBreakdown: Record<string, number>;
}

export interface TimelineSummary {
  buckets: TimelineBucket[];
  totalSouls: number;
  peakBucket: TimelineBucket | null;
  averageSoulsPerInterval: number;
  currentVelocityPerHour: number;
  topSurgeCauses: string[];
  activeGroups: string[];
}

/** Formats a timestamp into a friendly hour label like "09:00 AM" */
export function formatHourLabel(date: Date): string {
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${strHours}:00 ${ampm}`;
}

/** Formats timestamp into compact label like "09:00" */
export function formatCompactTime(date: Date): string {
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'p' : 'a';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}${ampm}`;
}

/**
 * Aggregates real soul winning records into time buckets and computes spike diagnostics.
 */
export function aggregateRecordsIntoTimeline(
  records: SoulWinningRecord[],
  granularityMinutes: number = 60
): TimelineSummary {
  if (!records || records.length === 0) {
    return {
      buckets: [],
      totalSouls: 0,
      peakBucket: null,
      averageSoulsPerInterval: 0,
      currentVelocityPerHour: 0,
      topSurgeCauses: [],
      activeGroups: [],
    };
  }

  // Filter out any invalid records and parse timestamps
  const validRecords = records
    .map((r) => {
      const timeStr = r.clientCreatedAt || r.createdAt || new Date().toISOString();
      const ts = new Date(timeStr).getTime();
      return {
        record: r,
        ts: isNaN(ts) ? Date.now() : ts,
      };
    })
    .sort((a, b) => a.ts - b.ts);

  if (validRecords.length === 0) {
    return {
      buckets: [],
      totalSouls: 0,
      peakBucket: null,
      averageSoulsPerInterval: 0,
      currentVelocityPerHour: 0,
      topSurgeCauses: [],
      activeGroups: [],
    };
  }

  const minTs = validRecords[0].ts;
  const maxTs = validRecords[validRecords.length - 1].ts;

  // Determine span: if span is very narrow (< 4 hours), expand to at least a 6-hour campaign window
  const intervalMs = granularityMinutes * 60 * 1000;
  const startAligned = Math.floor(minTs / intervalMs) * intervalMs;
  let endAligned = Math.ceil(maxTs / intervalMs) * intervalMs;

  if (endAligned - startAligned < 5 * intervalMs) {
    endAligned = startAligned + 5 * intervalMs;
  }

  // Create empty buckets across span
  const bucketsMap = new Map<number, SoulWinningRecord[]>();
  for (let t = startAligned; t <= endAligned; t += intervalMs) {
    bucketsMap.set(t, []);
  }

  // Distribute records into nearest bucket
  validRecords.forEach(({ record, ts }) => {
    // Find bucket
    const bucketTs = Math.floor(ts / intervalMs) * intervalMs;
    const existing = bucketsMap.get(bucketTs);
    if (existing) {
      existing.push(record);
    } else {
      bucketsMap.set(bucketTs, [record]);
    }
  });

  const sortedTimestamps = Array.from(bucketsMap.keys()).sort((a, b) => a - b);
  const buckets: TimelineBucket[] = [];
  let runningCumulative = 0;
  const allCounts: number[] = [];
  const allGroups = new Set<string>();

  sortedTimestamps.forEach((ts) => {
    const recs = bucketsMap.get(ts) || [];
    const count = recs.length;
    runningCumulative += count;
    allCounts.push(count);

    // Group breakdown
    const groupCounts: Record<string, number> = {};
    const churchCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    const winnerCounts: Record<string, number> = {};
    let bornAgain = 0;
    let holySpirit = 0;

    recs.forEach((r) => {
      const gName = r.groupName || 'Abuja Zone 1';
      allGroups.add(gName);
      groupCounts[gName] = (groupCounts[gName] || 0) + 1;

      const cName = r.churchName || 'Zone Central';
      churchCounts[cName] = (churchCounts[cName] || 0) + 1;

      const loc = r.location || 'Outreach Center';
      locCounts[loc] = (locCounts[loc] || 0) + 1;

      const wName = r.name || 'Soul Winner';
      winnerCounts[wName] = (winnerCounts[wName] || 0) + 1;

      if (r.isBornAgain) bornAgain++;
      if (r.isFilledWithHolySpirit) holySpirit++;
    });

    // Determine top contributors
    const sortedGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);
    const sortedChurches = Object.entries(churchCounts).sort((a, b) => b[1] - a[1]);
    const sortedLocs = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);
    const sortedWinners = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1]);

    const primaryGroup = sortedGroups[0] ? sortedGroups[0][0] : 'General Outreach';
    const primaryGroupCount = sortedGroups[0] ? sortedGroups[0][1] : 0;
    const primaryGroupPercentage = count > 0 ? Math.round((primaryGroupCount / count) * 100) : 0;

    const primaryChurch = sortedChurches[0] ? sortedChurches[0][0] : 'CE Abuja Zone 1';
    const primaryChurchCount = sortedChurches[0] ? sortedChurches[0][1] : 0;

    const topLocations = sortedLocs.slice(0, 3).map(([location, c]) => ({ location, count: c }));
    const topSoulWinners = sortedWinners.slice(0, 3).map(([name, c]) => ({ name, count: c }));

    let headline = 'Steady field entries recorded.';
    if (count > 0) {
      if (topLocations[0]) {
        headline = `${primaryGroup} mobilization at ${topLocations[0].location} (${primaryGroupCount} souls).`;
      } else {
        headline = `${primaryGroup} leads with ${primaryGroupCount} souls in this window.`;
      }
    }

    const dateObj = new Date(ts);
    buckets.push({
      id: `tb-${ts}`,
      timeLabel: formatHourLabel(dateObj),
      timestamp: ts,
      soulsCount: count,
      cumulativeSouls: runningCumulative,
      isSpike: false, // Calculated in second pass
      spikeIntensity: 'none',
      spikeCause: {
        primaryGroup,
        primaryGroupCount,
        primaryGroupPercentage,
        primaryChurch,
        primaryChurchCount,
        topLocations,
        topSoulWinners,
        bornAgainCount: bornAgain,
        holySpiritCount: holySpirit,
        headline,
      },
      records: recs,
      groupBreakdown: groupCounts,
    });
  });

  // Calculate stats & detect spikes
  const nonZeroCounts = allCounts.filter((c) => c > 0);
  const avgCount =
    nonZeroCounts.length > 0
      ? nonZeroCounts.reduce((sum, c) => sum + c, 0) / nonZeroCounts.length
      : 0;

  let maxCount = 0;
  let peakBucket: TimelineBucket | null = null;

  buckets.forEach((b) => {
    if (b.soulsCount > maxCount) {
      maxCount = b.soulsCount;
      peakBucket = b;
    }
  });

  // Second pass: mark spikes
  const topCauses: string[] = [];
  buckets.forEach((b) => {
    if (b.soulsCount > 0) {
      if (b.soulsCount === maxCount && maxCount >= 2) {
        b.isSpike = true;
        b.spikeIntensity = 'peak';
        topCauses.push(`👑 Peak: ${b.timeLabel} — ${b.spikeCause.headline}`);
      } else if (b.soulsCount >= avgCount * 1.5 && b.soulsCount >= 2) {
        b.isSpike = true;
        b.spikeIntensity = 'high';
        topCauses.push(`⚡ Surge: ${b.timeLabel} — ${b.spikeCause.headline}`);
      } else if (b.soulsCount >= avgCount * 1.15 && b.soulsCount >= 1) {
        b.isSpike = true;
        b.spikeIntensity = 'moderate';
      }
    }
  });

  // Estimate current velocity (souls in last bucket or recent window)
  const recentBucket = buckets[buckets.length - 1];
  const currentVelocityPerHour = recentBucket ? Math.round(recentBucket.soulsCount * (60 / granularityMinutes)) : 0;

  return {
    buckets,
    totalSouls: runningCumulative,
    peakBucket,
    averageSoulsPerInterval: Math.round(avgCount),
    currentVelocityPerHour,
    topSurgeCauses: topCauses.slice(0, 5),
    activeGroups: Array.from(allGroups),
  };
}

/**
 * Creates a high-fidelity campaign simulation dataset (e.g. for Oct 1st preview & demonstration).
 * Shows realistic morning surges, market rushes, lunch-hour waves, and evening street rally spikes!
 */
export function generateCampaignDaySimulation(): SoulWinningRecord[] {
  const baseDate = new Date();
  baseDate.setHours(6, 0, 0, 0); // Start 6:00 AM

  const demoGroups = [
    { name: 'Gwarinpa Group', church: 'CE Gwarinpa 1', hub: 'Wuse Market' },
    { name: 'Dawaki Sub-Group', church: 'CE Dawaki', hub: 'Dutse Market' },
    { name: 'Zonal Church Group', church: 'CE Zonal Church', hub: 'Central Area Plaza' },
    { name: 'Karmo Group', church: 'CE Karmo', hub: 'Karmo Motor Park' },
    { name: 'Kubwa Group 1', church: 'CE Kubwa 1', hub: 'Kubwa Village Market' },
    { name: 'Bwari Group', church: 'CE Bwari Main', hub: 'Federal Law School Junction' },
    { name: 'Wuye Sub-Group 1', church: 'CE Wuye', hub: 'Banex Shopping Complex' },
    { name: 'Airport Road Group', church: 'CE Airport Rd', hub: 'Lugbe Federal Housing' },
  ];

  const winners = [
    'Bro Emmanuel', 'Sis Grace', 'Bro David', 'Sister Blessing', 'Bro Joshua',
    'Sister Joy', 'Bro Michael', 'Sister Ruth', 'Bro Peter', 'Sister Deborah'
  ];

  // Specific planned spikes across campaign day:
  // 07:00 AM - Early Morning Transit Commuters (+28)
  // 10:00 AM - Big Morning Market Invasion (+85) [HIGH SPIKE]
  // 01:00 PM - Afternoon Lunch Outreach (+62) [MODERATE SPIKE]
  // 04:00 PM - Massive Evening City Rally (+140) [PEAK SPIKE]
  // 07:00 PM - Twilight Personal Evangelism (+45)
  const plannedHours = [
    { hour: 7, count: 28, label: 'Morning Transit Commuters Rush' },
    { hour: 8, count: 18, label: 'Morning Prayer Walk' },
    { hour: 9, count: 35, label: 'Market Stall Enlistment' },
    { hour: 10, count: 85, label: '🔥 Wuse & Banex Mega Market Wave' },
    { hour: 11, count: 48, label: 'Commercial Hub Follow-up' },
    { hour: 12, count: 52, label: 'Plaza & Transit Centers Outreach' },
    { hour: 13, count: 62, label: '⚡ Midday Office & Transit Surge' },
    { hour: 14, count: 38, label: 'Neighborhood House-to-House' },
    { hour: 15, count: 44, label: 'University & Youth Campus Drive' },
    { hour: 16, count: 140, label: '👑 ZONAL AFTERNOON MASSIVE STREET HARVEST' },
    { hour: 17, count: 95, label: '⚡ Evening Motor Park Mega Outreach' },
    { hour: 18, count: 70, label: 'Twilight Commercial Strip Surge' },
    { hour: 19, count: 45, label: 'Late Evening Community Outreach' },
  ];

  const records: SoulWinningRecord[] = [];
  let recordIdSeq = 1000;

  plannedHours.forEach((spec) => {
    const hourDate = new Date(baseDate);
    hourDate.setHours(spec.hour, 15, 0, 0);

    for (let i = 0; i < spec.count; i++) {
      recordIdSeq++;
      // Jitter timestamps within the hour
      const minuteOffset = (i * 7) % 55;
      const recordDate = new Date(hourDate);
      recordDate.setMinutes(minuteOffset);

      const groupPick = demoGroups[i % demoGroups.length];
      const winnerPick = winners[i % winners.length];
      const isoTime = recordDate.toISOString();

      records.push({
        id: `sim-rec-${recordIdSeq}`,
        name: `Soul Won #${recordIdSeq}`,
        phone: `0803${String(recordIdSeq).padStart(7, '0')}`,
        location: groupPick.hub,
        createdAt: isoTime,
        clientCreatedAt: isoTime,
        syncStatus: 'synced',
        groupName: groupPick.name,
        churchName: groupPick.church,
        isBornAgain: i % 4 !== 0, // 75%
        isFilledWithHolySpirit: i % 3 === 0, // 33%
        notes: `${winnerPick} led this soul to Christ at ${groupPick.hub}.`,
      });
    }
  });

  return records;
}
