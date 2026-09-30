import { getGroups, getChurches } from './organizationService';
import { getTargets } from './targetService';
import { getAllUsers, getAllSoulWinnerProfiles } from './userService';
import { getAllLocalRecords } from './indexedDbService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import { findCanonicalGroup, findCanonicalChurch } from './targetProgressEngine';
import { generateCSV, downloadCSVFile } from '../utils/csv';
import type { SoulWinningRecord } from '../types/record';
import type { UserProfile, SoulWinnerProfile } from '../types/auth';
import type { Group, Church } from '../types/organization';

export interface GroupDirectoryItem {
  id: string;
  name: string;
  code: string;
  target: number;
  soulsWon: number;
  percentage: number;
  churchesCount: number;
  soulWinnersCount: number;
  status: string;
}

export interface ChurchDirectoryItem {
  id: string;
  name: string;
  code: string;
  groupId: string;
  groupName: string;
  target: number;
  soulsWon: number;
  percentage: number;
  soulWinnersCount: number;
  status: string;
}

export interface SoulWinnerDirectoryItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  churchId?: string;
  churchName?: string;
  groupId?: string;
  groupName?: string;
  soulsWon: number;
}

export interface SoulRecordDirectoryItem {
  id: string;
  name: string;
  phone: string;
  location: string;
  churchId?: string;
  churchName?: string;
  groupId?: string;
  groupName?: string;
  soulWinnerId?: string;
  soulWinnerName?: string;
  isBornAgain: boolean;
  isFilledWithHolySpirit: boolean;
  notes?: string;
  createdAt: string;
  syncStatus: string;
}

export interface ZoneDirectorySummary {
  zoneName: string;
  totalGroups: number;
  totalChurches: number;
  totalSoulWinners: number;
  totalSoulsWon: number;
  target: number;
  percentage: number;
  bornAgainCount: number;
  holySpiritCount: number;
}

export interface CompleteDirectoryData {
  summary: ZoneDirectorySummary;
  groups: GroupDirectoryItem[];
  churches: ChurchDirectoryItem[];
  soulWinners: SoulWinnerDirectoryItem[];
  records: SoulRecordDirectoryItem[];
}

/**
 * Fetch all records combining Firestore remote collection and local IndexedDB
 */
async function fetchAllUnifiedRecords(): Promise<SoulWinningRecord[]> {
  const local = await getAllLocalRecords();
  const recordMap = new Map<string, SoulWinningRecord>();

  // Add local records first
  local.forEach((r) => recordMap.set(r.id, r));

  // If online, fetch remote records from Firestore
  if (navigator.onLine) {
    try {
      const q = query(collection(db, 'soulWinningRecords'));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as SoulWinningRecord;
        recordMap.set(data.id || d.id, data);
      });
    } catch (err) {
      console.warn('DirectoryService: could not fetch remote records, using local cache:', err);
    }
  }

  return Array.from(recordMap.values());
}

/**
 * Aggregates complete directory data across all 5 levels
 */
export async function getCompleteDirectoryData(): Promise<CompleteDirectoryData> {
  const [groups, churches, targets, users, swProfiles, records] = await Promise.all([
    getGroups(),
    getChurches(),
    getTargets(),
    getAllUsers(),
    getAllSoulWinnerProfiles(),
    fetchAllUnifiedRecords(),
  ]);

  // Lookup maps
  const groupMap = new Map<string, Group>();
  groups.forEach((g) => groupMap.set(g.id, g));

  const churchMap = new Map<string, Church>();
  churches.forEach((c) => churchMap.set(c.id, c));

  const targetMap = new Map<string, number>();
  targets.forEach((t) => {
    targetMap.set(`${t.level}_${t.organizationId}`, t.target);
  });

  const userMap = new Map<string, UserProfile>();
  users.forEach((u) => userMap.set(u.id, u));

  const swProfileMap = new Map<string, SoulWinnerProfile>();
  swProfiles.forEach((p) => swProfileMap.set(p.userId || p.id, p));

  // 1. Group records by group, church, soul winner
  const soulsByGroup: Record<string, number> = {};
  const soulsByChurch: Record<string, number> = {};
  const soulsBySoulWinner: Record<string, number> = {};

  let bornAgainCount = 0;
  let holySpiritCount = 0;

  records.forEach((r) => {
    const canonicalGroup = findCanonicalGroup(r.groupId, r.groupName, r.churchId, r.churchName, groups, churches);
    const canonicalChurch = findCanonicalChurch(r.churchId, r.churchName, churches);

    if (canonicalGroup) {
      soulsByGroup[canonicalGroup.id] = (soulsByGroup[canonicalGroup.id] || 0) + 1;
    }
    if (canonicalChurch) {
      soulsByChurch[canonicalChurch.id] = (soulsByChurch[canonicalChurch.id] || 0) + 1;
    }
    if (r.soulWinnerId) {
      soulsBySoulWinner[r.soulWinnerId] = (soulsBySoulWinner[r.soulWinnerId] || 0) + 1;
    }
    if (r.isBornAgain !== false) bornAgainCount++;
    if (r.isFilledWithHolySpirit !== false) holySpiritCount++;
  });

  // 2. Count soul winners per group and church
  const soulWinnersByGroup: Record<string, number> = {};
  const soulWinnersByChurch: Record<string, number> = {};

  swProfiles.forEach((sw) => {
    if (sw.groupId) {
      soulWinnersByGroup[sw.groupId] = (soulWinnersByGroup[sw.groupId] || 0) + 1;
    }
    if (sw.churchId) {
      soulWinnersByChurch[sw.churchId] = (soulWinnersByChurch[sw.churchId] || 0) + 1;
    }
  });

  // Count churches per group
  const churchesByGroup: Record<string, number> = {};
  churches.forEach((c) => {
    churchesByGroup[c.groupId] = (churchesByGroup[c.groupId] || 0) + 1;
  });

  // 3. Build Group Directory Items
  const groupItems: GroupDirectoryItem[] = groups.map((g) => {
    const target = targetMap.get(`group_${g.id}`) || 2000;
    const soulsWon = soulsByGroup[g.id] || 0;
    const percentage = target > 0 ? Math.round((soulsWon / target) * 100) : 0;
    return {
      id: g.id,
      name: g.name,
      code: g.code,
      target,
      soulsWon,
      percentage,
      churchesCount: churchesByGroup[g.id] || 0,
      soulWinnersCount: soulWinnersByGroup[g.id] || 0,
      status: g.status,
    };
  });

  // 4. Build Church Directory Items
  const churchItems: ChurchDirectoryItem[] = churches.map((c) => {
    const parentGroup = groupMap.get(c.groupId);
    const target = targetMap.get(`church_${c.id}`) || 500;
    const soulsWon = soulsByChurch[c.id] || 0;
    const percentage = target > 0 ? Math.round((soulsWon / target) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      groupId: c.groupId,
      groupName: parentGroup ? parentGroup.name : 'Unknown Group',
      target,
      soulsWon,
      percentage,
      soulWinnersCount: soulWinnersByChurch[c.id] || 0,
      status: c.status,
    };
  });

  // 5. Build Soul Winner Directory Items
  const soulWinnerItems: SoulWinnerDirectoryItem[] = users.map((u) => {
    const sw = swProfileMap.get(u.id);
    const church = sw?.churchId ? churchMap.get(sw.churchId) : undefined;
    const group = sw?.groupId ? groupMap.get(sw.groupId) : undefined;
    return {
      id: u.id,
      name: u.name,
      email: u.email || '—',
      phone: u.phone || '—',
      role: u.role,
      status: u.status,
      churchId: sw?.churchId,
      churchName: church?.name || sw?.churchName || '—',
      groupId: sw?.groupId,
      groupName: group?.name || sw?.groupName || '—',
      soulsWon: soulsBySoulWinner[u.id] || 0,
    };
  });

  // 6. Build Records Directory Items
  const recordItems: SoulRecordDirectoryItem[] = records.map((r) => {
    const canonicalGroup = findCanonicalGroup(r.groupId, r.groupName, r.churchId, r.churchName, groups, churches);
    const canonicalChurch = findCanonicalChurch(r.churchId, r.churchName, churches);

    const church = canonicalChurch || (r.churchId ? churchMap.get(r.churchId) : undefined);
    const group = canonicalGroup || (r.groupId ? groupMap.get(r.groupId) : undefined);
    const sw = r.soulWinnerId ? userMap.get(r.soulWinnerId) : undefined;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      location: r.location || church?.name || '—',
      churchId: church?.id || r.churchId,
      churchName: church?.name || r.churchName || '—',
      groupId: group?.id || r.groupId,
      groupName: group?.name || r.groupName || '—',
      soulWinnerId: r.soulWinnerId,
      soulWinnerName: sw?.name || 'Soul Winner',
      isBornAgain: r.isBornAgain !== false,
      isFilledWithHolySpirit: r.isFilledWithHolySpirit !== false,
      notes: r.notes || '',
      createdAt: r.createdAt || r.clientCreatedAt || new Date().toISOString(),
      syncStatus: r.syncStatus || 'synced',
    };
  });

  // 7. Build Zonal Summary
  const zonalTarget = targetMap.get('zone_zone-abuja-1') || 50000;
  const totalSoulsWon = records.length;
  const summary: ZoneDirectorySummary = {
    zoneName: 'Christ Embassy Abuja Zone 1',
    totalGroups: groups.length,
    totalChurches: churches.length,
    totalSoulWinners: users.length,
    totalSoulsWon,
    target: zonalTarget,
    percentage: zonalTarget > 0 ? Math.round((totalSoulsWon / zonalTarget) * 100) : 0,
    bornAgainCount,
    holySpiritCount,
  };

  return {
    summary,
    groups: groupItems,
    churches: churchItems,
    soulWinners: soulWinnerItems,
    records: recordItems,
  };
}

/**
 * EXPORT CSV HELPERS
 */

export function exportGroupsCSV(groups: GroupDirectoryItem[], filename = 'ceaz1_groups_directory.csv') {
  const headers = ['Group Name', 'Group Code', 'Target', 'Souls Won', 'Percentage', 'Churches Count', 'Soul Winners Count', 'Status'];
  const rows = groups.map((g) => [
    g.name,
    g.code,
    String(g.target),
    String(g.soulsWon),
    `${g.percentage}%`,
    String(g.churchesCount),
    String(g.soulWinnersCount),
    g.status,
  ]);
  const csv = generateCSV(headers, rows);
  downloadCSVFile(filename, csv);
}

export function exportChurchesCSV(churches: ChurchDirectoryItem[], filename = 'ceaz1_churches_directory.csv') {
  const headers = ['Church Name', 'Church Code', 'Group Name', 'Target', 'Souls Won', 'Percentage', 'Soul Winners Count', 'Status'];
  const rows = churches.map((c) => [
    c.name,
    c.code,
    c.groupName,
    String(c.target),
    String(c.soulsWon),
    `${c.percentage}%`,
    String(c.soulWinnersCount),
    c.status,
  ]);
  const csv = generateCSV(headers, rows);
  downloadCSVFile(filename, csv);
}

export function exportSoulWinnersCSV(soulWinners: SoulWinnerDirectoryItem[], filename = 'ceaz1_soul_winners_directory.csv') {
  const headers = ['Full Name', 'Phone Number', 'Email', 'Role', 'Status', 'Church', 'Group', 'Souls Won Recorded'];
  const rows = soulWinners.map((sw) => [
    sw.name,
    sw.phone,
    sw.email,
    sw.role,
    sw.status,
    sw.churchName || '',
    sw.groupName || '',
    String(sw.soulsWon),
  ]);
  const csv = generateCSV(headers, rows);
  downloadCSVFile(filename, csv);
}

export function exportRecordsCSV(records: SoulRecordDirectoryItem[], filename = 'ceaz1_souls_won_records.csv') {
  const headers = [
    'Convert Name',
    'Phone Number',
    'Location',
    'Church',
    'Group',
    'Recorded By',
    'Born Again',
    'Filled With Holy Spirit',
    'Date Recorded',
    'Notes',
  ];
  const rows = records.map((r) => [
    r.name,
    r.phone,
    r.location,
    r.churchName || '',
    r.groupName || '',
    r.soulWinnerName || '',
    r.isBornAgain ? 'Yes' : 'No',
    r.isFilledWithHolySpirit ? 'Yes' : 'No',
    new Date(r.createdAt).toLocaleString(),
    r.notes || '',
  ]);
  const csv = generateCSV(headers, rows);
  downloadCSVFile(filename, csv);
}

export function exportZonalExecutiveSummaryCSV(summary: ZoneDirectorySummary, groups: GroupDirectoryItem[], filename = 'ceaz1_executive_summary.csv') {
  const headers = ['Zone Name', 'Total Target', 'Total Souls Won', 'Percentage Achieved', 'Total Groups', 'Total Churches', 'Total Soul Winners', 'Born Again Souls', 'Holy Spirit Souls'];
  const summaryRow = [
    summary.zoneName,
    String(summary.target),
    String(summary.totalSoulsWon),
    `${summary.percentage}%`,
    String(summary.totalGroups),
    String(summary.totalChurches),
    String(summary.totalSoulWinners),
    String(summary.bornAgainCount),
    String(summary.holySpiritCount),
  ];

  const groupHeaders = ['', 'Group Name', 'Group Target', 'Souls Won', '% Achieved', 'Total Churches', 'Total Soul Winners'];
  const groupRows = groups.map((g, idx) => [
    `#${idx + 1}`,
    g.name,
    String(g.target),
    String(g.soulsWon),
    `${g.percentage}%`,
    String(g.churchesCount),
    String(g.soulWinnersCount),
  ]);

  const csv = [
    generateCSV(headers, [summaryRow]),
    '',
    'GROUPS RACE BREAKDOWN',
    generateCSV(groupHeaders, groupRows),
  ].join('\n');

  downloadCSVFile(filename, csv);
}
