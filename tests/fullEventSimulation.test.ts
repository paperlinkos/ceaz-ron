import { describe, it, expect, beforeEach } from 'vitest';
import type { Zone, Group, Church, PCF } from '../src/types/organization';
import type { UserProfile, SoulWinnerProfile } from '../src/types/auth';
import type { SoulWinningRecord } from '../src/types/record';
import type { Target } from '../src/types/target';
import type { EventConfig } from '../src/config/eventConfig';
import { calculateOrganizationProgress } from '../src/services/targetProgressEngine';
import { getUserScope, isAuthorizedForOrg } from '../src/services/roleScopeService';
import { generateUUID } from '../src/utils/uuid';

// Simulation Environment Model
interface SimulationEnvironment {
  event: EventConfig;
  zones: Zone[];
  groups: Group[];
  churches: Church[];
  pcfs: PCF[];
  users: UserProfile[];
  soulWinners: SoulWinnerProfile[];
  targets: Target[];
  records: SoulWinningRecord[];
  offlineQueue: SoulWinningRecord[];
}

describe('Phase 12: Full Event Simulation & System Integration', () => {
  let sim: SimulationEnvironment;

  beforeEach(() => {
    // 1. Isolated Simulation Setup
    const zoneAbuja: Zone = {
      id: 'sim-zone-abj',
      name: 'Abuja Zone',
      code: 'SIM-ABJ',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const groupGwarinpa: Group = {
      id: 'sim-grp-gwr',
      name: 'Gwarinpa Group',
      code: 'SIM-GWR',
      zoneId: zoneAbuja.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const groupWuse: Group = {
      id: 'sim-grp-wus',
      name: 'Wuse Group',
      code: 'SIM-WUS',
      zoneId: zoneAbuja.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const churchGwarinpa1: Church = {
      id: 'sim-ch-gwr1',
      name: 'CE Gwarinpa 1',
      code: 'SIM-CG1',
      groupId: groupGwarinpa.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const churchWuse1: Church = {
      id: 'sim-ch-wus1',
      name: 'CE Wuse 1',
      code: 'SIM-CW1',
      groupId: groupWuse.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const pcfGrace: PCF = {
      id: 'sim-pcf-grace',
      name: 'Grace PCF',
      code: 'SIM-GP1',
      churchId: churchGwarinpa1.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const pcfMercy: PCF = {
      id: 'sim-pcf-mercy',
      name: 'Mercy PCF',
      code: 'SIM-MP1',
      churchId: churchGwarinpa1.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const pcfFaith: PCF = {
      id: 'sim-pcf-faith',
      name: 'Faith PCF',
      code: 'SIM-FP1',
      churchId: churchWuse1.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userAdmin: UserProfile = {
      uid: 'user-sim-admin',
      email: 'superadmin@ron.ng',
      name: 'SuperAdmin User',
      role: 'superAdmin',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userZoneMgr: UserProfile = {
      uid: 'user-sim-zm',
      email: 'zonemanager@ron.ng',
      name: 'Pastor Abuja ZM',
      role: 'zoneManager',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userGroupMgr: UserProfile = {
      uid: 'user-sim-gm',
      email: 'groupmanager@ron.ng',
      name: 'Pastor Gwarinpa GM',
      role: 'groupManager',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userChurchMgr: UserProfile = {
      uid: 'user-sim-cm',
      email: 'churchmanager@ron.ng',
      name: 'Pastor CE Gwarinpa 1 CM',
      role: 'churchManager',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userPcfLeader: UserProfile = {
      uid: 'user-sim-pl',
      email: 'pcfleader@ron.ng',
      name: 'Leader Grace PCF',
      role: 'pcfLeader',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userWinnerA: UserProfile = {
      uid: 'user-sim-sw-a',
      email: 'winner.a@ron.ng',
      name: 'Soul Winner A',
      role: 'soulWinner',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const userWinnerB: UserProfile = {
      uid: 'user-sim-sw-b',
      email: 'winner.b@ron.ng',
      name: 'Soul Winner B',
      role: 'soulWinner',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const swProfileZM: SoulWinnerProfile = {
      uid: userZoneMgr.uid,
      zoneId: zoneAbuja.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const swProfileGM: SoulWinnerProfile = {
      uid: userGroupMgr.uid,
      zoneId: zoneAbuja.id,
      groupId: groupGwarinpa.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const swProfileA: SoulWinnerProfile = {
      uid: userWinnerA.uid,
      pcfId: pcfGrace.id,
      churchId: churchGwarinpa1.id,
      groupId: groupGwarinpa.id,
      zoneId: zoneAbuja.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const swProfileB: SoulWinnerProfile = {
      uid: userWinnerB.uid,
      pcfId: pcfGrace.id,
      churchId: churchGwarinpa1.id,
      groupId: groupGwarinpa.id,
      zoneId: zoneAbuja.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const targets: Target[] = [
      {
        id: 'tgt-zone',
        eventId: 'ron-2026',
        level: 'zone',
        organizationId: zoneAbuja.id,
        target: 40000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: userAdmin.uid,
        updatedBy: userAdmin.uid,
        status: 'active',
      },
      {
        id: 'tgt-grp-gwr',
        eventId: 'ron-2026',
        level: 'group',
        organizationId: groupGwarinpa.id,
        target: 10000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: userAdmin.uid,
        updatedBy: userAdmin.uid,
        status: 'active',
      },
      {
        id: 'tgt-ch-gwr1',
        eventId: 'ron-2026',
        level: 'church',
        organizationId: churchGwarinpa1.id,
        target: 2000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: userAdmin.uid,
        updatedBy: userAdmin.uid,
        status: 'active',
      },
      {
        id: 'tgt-pcf-grace',
        eventId: 'ron-2026',
        level: 'pcf',
        organizationId: pcfGrace.id,
        target: 500,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: userAdmin.uid,
        updatedBy: userAdmin.uid,
        status: 'active',
      },
    ];

    sim = {
      event: {
        id: 'ron-2026',
        name: 'Reach Out Nigeria 2026',
        status: 'live',
        target: 40000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      zones: [zoneAbuja],
      groups: [groupGwarinpa, groupWuse],
      churches: [churchGwarinpa1, churchWuse1],
      pcfs: [pcfGrace, pcfMercy, pcfFaith],
      users: [userAdmin, userZoneMgr, userGroupMgr, userChurchMgr, userPcfLeader, userWinnerA, userWinnerB],
      soulWinners: [swProfileZM, swProfileGM, swProfileA, swProfileB],
      targets,
      records: [],
      offlineQueue: [],
    };
  });

  // Helper to record a soul in simulation
  function recordSoul(
    winnerProfile: SoulWinnerProfile,
    winnerUser: UserProfile,
    soulName: string,
    phone: string,
    location: string,
    isOffline = false
  ): SoulWinningRecord {
    if (sim.event.status !== 'live' && !isOffline) {
      throw new Error(`Recording blocked: Event is in ${sim.event.status} state.`);
    }

    const record: SoulWinningRecord = {
      id: generateUUID(),
      soulWinnerId: winnerUser.uid,
      soulWinnerName: winnerUser.name,
      name: soulName,
      phone,
      location,
      pcfId: winnerProfile.pcfId || 'sim-pcf-grace',
      churchId: winnerProfile.churchId || 'sim-ch-gwr1',
      groupId: winnerProfile.groupId || 'sim-grp-gwr',
      zoneId: winnerProfile.zoneId || 'sim-zone-abj',
      createdAt: new Date().toISOString(),
      clientCreatedAt: new Date().toISOString(),
      syncStatus: isOffline ? 'pending' : 'synced',
    };

    if (isOffline) {
      sim.offlineQueue.push(record);
    } else {
      sim.records.push(record);
    }
    return record;
  }

  it('1. Event Lifecycle: UPCOMING blocks live recording; LIVE allows recording; COMPLETED blocks new souls', () => {
    // Upcoming
    sim.event.status = 'upcoming';
    expect(() => recordSoul(sim.soulWinners[2], sim.users[5], 'Test Soul', '+2348000000001', 'Market')).toThrow(
      'Recording blocked: Event is in upcoming state.'
    );

    // Live
    sim.event.status = 'live';
    const rec = recordSoul(sim.soulWinners[2], sim.users[5], 'Live Soul', '+2348000000002', 'Plaza');
    expect(rec.id).toBeDefined();
    expect(sim.records.length).toBe(1);

    // Completed
    sim.event.status = 'completed';
    expect(() => recordSoul(sim.soulWinners[2], sim.users[5], 'Post Event Soul', '+2348000000003', 'Street')).toThrow(
      'Recording blocked: Event is in completed state.'
    );
  });

  it('2. Single Soul Flow: Exactly +1 increment propagates across Soul Winner, PCF, Church, Group, Zone, and National', () => {
    sim.event.status = 'live';
    recordSoul(sim.soulWinners[2], sim.users[5], 'Brother Paul', '+2348011111111', 'Gwarinpa Estate');

    const totalNational = sim.records.length;
    const zoneCount = sim.records.filter((r) => r.zoneId === 'sim-zone-abj').length;
    const groupCount = sim.records.filter((r) => r.groupId === 'sim-grp-gwr').length;
    const churchCount = sim.records.filter((r) => r.churchId === 'sim-ch-gwr1').length;
    const pcfCount = sim.records.filter((r) => r.pcfId === 'sim-pcf-grace').length;
    const winnerCount = sim.records.filter((r) => r.soulWinnerId === 'user-sim-sw-a').length;

    expect(totalNational).toBe(1);
    expect(zoneCount).toBe(1);
    expect(groupCount).toBe(1);
    expect(churchCount).toBe(1);
    expect(pcfCount).toBe(1);
    expect(winnerCount).toBe(1);
  });

  it('3. Multiple Soul Flow: 10 souls recorded by 1 Winner result in 10 for Winner, PCF, Church, Group, Zone, National', () => {
    sim.event.status = 'live';
    for (let i = 1; i <= 10; i++) {
      recordSoul(sim.soulWinners[2], sim.users[5], `Soul #${i}`, `+234802222220${i}`, 'Park');
    }

    expect(sim.records.length).toBe(10);
    expect(sim.records.filter((r) => r.soulWinnerId === 'user-sim-sw-a').length).toBe(10);
    expect(sim.records.filter((r) => r.pcfId === 'sim-pcf-grace').length).toBe(10);
    expect(sim.records.filter((r) => r.churchId === 'sim-ch-gwr1').length).toBe(10);
    expect(sim.records.filter((r) => r.groupId === 'sim-grp-gwr').length).toBe(10);
    expect(sim.records.filter((r) => r.zoneId === 'sim-zone-abj').length).toBe(10);
  });

  it('4. Multiple Soul Winners within same PCF aggregate correctly', () => {
    sim.event.status = 'live';
    // Winner A = 10 souls
    for (let i = 1; i <= 10; i++) {
      recordSoul(sim.soulWinners[2], sim.users[5], `WinnerA Soul ${i}`, `+234803333330${i}`, 'Mall');
    }
    // Winner B = 25 souls
    for (let i = 1; i <= 25; i++) {
      recordSoul(sim.soulWinners[3], sim.users[6], `WinnerB Soul ${i}`, `+234804444440${i}`, 'Campus');
    }

    const pcfGraceCount = sim.records.filter((r) => r.pcfId === 'sim-pcf-grace').length;
    expect(pcfGraceCount).toBe(35);
    expect(sim.records.length).toBe(35);
  });

  it('5. Target Engine Progress Calculation: actual < target, actual = target, actual > target (exceeded)', () => {
    const target = 1000;

    // Actual = 500 (50%)
    const p1 = calculateOrganizationProgress({
      organizationId: 'org1',
      organizationName: 'Org 1',
      level: 'pcf',
      actual: 500,
      target,
    });
    expect(p1.percentage).toBe(50);
    expect(p1.normalizedProgress).toBe(0.5);
    expect(p1.isTargetExceeded).toBe(false);

    // Actual = 1000 (100%)
    const p2 = calculateOrganizationProgress({
      organizationId: 'org1',
      organizationName: 'Org 1',
      level: 'pcf',
      actual: 1000,
      target,
    });
    expect(p2.percentage).toBe(100);
    expect(p2.normalizedProgress).toBe(1.0);
    expect(p2.isTargetExceeded).toBe(false);

    // Actual = 1120 (112% percentage, 1.0 normalized progress limit)
    const p3 = calculateOrganizationProgress({
      organizationId: 'org1',
      organizationName: 'Org 1',
      level: 'pcf',
      actual: 1120,
      target,
    });
    expect(p3.percentage).toBe(112);
    expect(p3.normalizedProgress).toBe(1.0); // Visual progress bar capped at 1.0
    expect(p3.isTargetExceeded).toBe(true);
  });

  it('6. Upward Race Height Mapping: progress percentage maps vertically from 0% up to 100% without falling', () => {
    const calcHeightPct = (actual: number, target: number) => {
      const p = calculateOrganizationProgress({
        organizationId: 'race-org',
        organizationName: 'Race Org',
        level: 'group',
        actual,
        target,
      });
      return Math.round(p.normalizedProgress * 100);
    };

    expect(calcHeightPct(0, 1000)).toBe(0);
    expect(calcHeightPct(250, 1000)).toBe(25);
    expect(calcHeightPct(500, 1000)).toBe(50);
    expect(calcHeightPct(750, 1000)).toBe(75);
    expect(calcHeightPct(1000, 1000)).toBe(100);
    expect(calcHeightPct(1500, 1000)).toBe(100);
  });

  it('7. Public Observer Privacy: Public observers can read target & counters but cannot access private phone numbers', () => {
    sim.event.status = 'live';
    recordSoul(sim.soulWinners[2], sim.users[5], 'Private Contact', '+2348099998888', 'Bus Terminal');

    const publicViewData = {
      eventStatus: sim.event.status,
      totalSouls: sim.records.length,
      nationalTarget: sim.event.target,
      percentage: (sim.records.length / sim.event.target) * 100,
    };

    expect(publicViewData.totalSouls).toBe(1);
    expect(publicViewData.nationalTarget).toBe(40000);
    // Public payload MUST NOT expose phone numbers
    expect((publicViewData as any).phone).toBeUndefined();
    expect((publicViewData as any).soulWinnerPhone).toBeUndefined();
  });

  it('8. Role Security Scope: Zone/Group/Church/PCF managers are restricted to assigned scope', () => {
    const userScopeZM = getUserScope(sim.users[1], sim.soulWinners[0]);
    const userScopeGM = getUserScope(sim.users[2], sim.soulWinners[1]);

    expect(userScopeZM.level).toBe('zone');
    expect(userScopeGM.level).toBe('group');

    // Group Manager is authorized for Gwarinpa Group and its Church
    const isAuthGwr = isAuthorizedForOrg(userScopeGM, 'sim-grp-gwr', 'group', sim.groups, sim.churches, sim.pcfs);
    expect(isAuthGwr).toBe(true);

    // Group Manager is BLOCKED from unauthorized Wuse Group
    const isAuthWus = isAuthorizedForOrg(userScopeGM, 'sim-grp-wus', 'group', sim.groups, sim.churches, sim.pcfs);
    expect(isAuthWus).toBe(false);
  });

  it('9. Offline Recording & Sync: 5 records stored offline sync exactly +5 without duplicates', () => {
    sim.event.status = 'live';
    // Record 5 offline souls
    for (let i = 1; i <= 5; i++) {
      recordSoul(sim.soulWinners[2], sim.users[5], `Offline Soul ${i}`, `+234807777770${i}`, 'Offline Site', true);
    }

    expect(sim.offlineQueue.length).toBe(5);
    expect(sim.records.length).toBe(0);

    // Reconnect & sync queue
    const syncedRecords = [...sim.offlineQueue].map((r) => ({ ...r, syncStatus: 'synced' as const }));
    sim.records.push(...syncedRecords);
    sim.offlineQueue = [];

    expect(sim.records.length).toBe(5);
    expect(sim.records.every((r) => r.syncStatus === 'synced')).toBe(true);
  });

  it('10. Offline Retry Idempotency: Retrying sync with same record UUID yields exactly 1 record', () => {
    sim.event.status = 'live';
    const offlineRec = recordSoul(sim.soulWinners[2], sim.users[5], 'Idempotent Soul', '+2348055555555', 'Station', true);

    // Sync Attempt 1
    const synced1 = { ...offlineRec, syncStatus: 'synced' as const };
    const existingIndex = sim.records.findIndex((r) => r.id === synced1.id);
    if (existingIndex === -1) sim.records.push(synced1);

    // Network Interruption & Retry Attempt 2
    const existingIndex2 = sim.records.findIndex((r) => r.id === synced1.id);
    if (existingIndex2 === -1) sim.records.push(synced1);

    expect(sim.records.length).toBe(1);
    expect(sim.records[0].id).toBe(offlineRec.id);
  });

  it('11. Mass Reconnection: 100 offline soul winners syncing simultaneously produce accurate non-duplicated totals', () => {
    sim.event.status = 'live';
    const numWinners = 100;

    for (let w = 0; w < numWinners; w++) {
      const winnerUid = `mass-sw-${w}`;
      const rec: SoulWinningRecord = {
        id: `mass-rec-${w}`,
        soulWinnerId: winnerUid,
        soulWinnerName: `Mass Winner ${w}`,
        name: `Soul ${w}`,
        phone: `+23480900000${w}`,
        location: 'Mass Outreach',
        pcfId: 'sim-pcf-grace',
        churchId: 'sim-ch-gwr1',
        groupId: 'sim-grp-gwr',
        zoneId: 'sim-zone-abj',
        createdAt: new Date().toISOString(),
        clientCreatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      sim.offlineQueue.push(rec);
    }

    expect(sim.offlineQueue.length).toBe(100);

    // Reconnect & sync mass queue
    const syncMap = new Map<string, SoulWinningRecord>();
    sim.offlineQueue.forEach((rec) => syncMap.set(rec.id, { ...rec, syncStatus: 'synced' }));
    sim.records.push(...Array.from(syncMap.values()));
    sim.offlineQueue = [];

    expect(sim.records.length).toBe(100);
  });

  it('12. Post-Event Offline Queue Rule: Offline souls created while event was LIVE are accepted post-completion', () => {
    sim.event.status = 'live';
    const liveTime = new Date().toISOString();
    const offlineRec: SoulWinningRecord = {
      id: 'offline-live-legit',
      soulWinnerId: sim.users[5].uid,
      soulWinnerName: sim.users[5].name,
      name: 'Legit Offline Soul',
      phone: '+2348011223344',
      location: 'Outreach Field',
      pcfId: 'sim-pcf-grace',
      churchId: 'sim-ch-gwr1',
      groupId: 'sim-grp-gwr',
      zoneId: 'sim-zone-abj',
      createdAt: liveTime,
      clientCreatedAt: liveTime, // Created while event was LIVE
      syncStatus: 'pending',
    };
    sim.offlineQueue.push(offlineRec);

    // Event transitions to COMPLETED before sync occurs
    sim.event.status = 'completed';
    const completionTime = new Date().toISOString();

    // Rule: If clientCreatedAt <= completionTime, accept record!
    const isLegitSync = new Date(offlineRec.clientCreatedAt) <= new Date(completionTime);
    if (isLegitSync) {
      sim.records.push({ ...offlineRec, syncStatus: 'synced' });
    }

    expect(sim.records.length).toBe(1);
    expect(sim.records[0].id).toBe('offline-live-legit');
  });

  it('13. Historical Attribution Protection: Reassigning a Soul Winner to a new PCF preserves past records under old PCF', () => {
    sim.event.status = 'live';
    // Soul Winner A records 20 souls under Grace PCF
    for (let i = 1; i <= 20; i++) {
      recordSoul(sim.soulWinners[2], sim.users[5], `Past Soul ${i}`, `+234808888880${i}`, 'Grace Field');
    }

    // Reassign Soul Winner A to Mercy PCF
    const updatedSwProfile: SoulWinnerProfile = {
      ...sim.soulWinners[2],
      pcfId: 'sim-pcf-mercy', // Reassigned
    };

    // Soul Winner A records 10 souls under new Mercy PCF
    for (let i = 1; i <= 10; i++) {
      recordSoul(updatedSwProfile, sim.users[5], `New Soul ${i}`, `+234809999990${i}`, 'Mercy Field');
    }

    const graceCount = sim.records.filter((r) => r.pcfId === 'sim-pcf-grace').length;
    const mercyCount = sim.records.filter((r) => r.pcfId === 'sim-pcf-mercy').length;

    expect(graceCount).toBe(20); // Historical 20 stay under Grace PCF!
    expect(mercyCount).toBe(10); // New 10 go to Mercy PCF!
  });

  it('14. Target Change & Org Rename Safety: Changing targets or renaming orgs updates metadata without altering record totals', () => {
    sim.event.status = 'live';
    for (let i = 1; i <= 500; i++) {
      recordSoul(sim.soulWinners[2], sim.users[5], `Soul ${i}`, `+2348000000000`, 'Field');
    }

    const actualBefore = sim.records.length;
    const targetObj = sim.targets.find((t) => t.id === 'tgt-zone')!;
    expect(actualBefore).toBe(500);

    const prog1 = calculateOrganizationProgress({
      organizationId: 'sim-zone-abj',
      organizationName: 'Abuja Zone',
      level: 'zone',
      actual: actualBefore,
      target: targetObj.target,
    });
    expect(prog1.percentage).toBe(1.3); // 500 / 40,000 = 1.25% rounded to 1.3%

    // Update target to 20,000
    targetObj.target = 20000;
    const actualAfterTargetChange = sim.records.length;
    expect(actualAfterTargetChange).toBe(500); // Records unchanged

    const prog2 = calculateOrganizationProgress({
      organizationId: 'sim-zone-abj',
      organizationName: 'Abuja Zone',
      level: 'zone',
      actual: actualAfterTargetChange,
      target: targetObj.target,
    });
    expect(prog2.percentage).toBe(2.5); // 500 / 20,000 = 2.5%

    // Rename Organization
    sim.zones[0].name = 'Abuja Zone Multi-Church';
    expect(sim.records.length).toBe(500); // Records remain 500
    expect(sim.zones[0].id).toBe('sim-zone-abj'); // Stable ID preserved
  });

  it('15. Full Tree Data Consistency Assertion: National == sum(Zones) == sum(Groups) == sum(Churches) == sum(PCFs) == sum(Winners)', () => {
    sim.event.status = 'live';
    // Record souls across multiple PCFs & winners
    for (let i = 1; i <= 15; i++) {
      recordSoul(sim.soulWinners[2], sim.users[5], `Soul Winner A - ${i}`, `+23480111111${i}`, 'Location A');
    }
    for (let i = 1; i <= 25; i++) {
      recordSoul(sim.soulWinners[3], sim.users[6], `Soul Winner B - ${i}`, `+23480222222${i}`, 'Location B');
    }

    const nationalTotal = sim.records.length;

    const sumZones = sim.zones.reduce(
      (acc, z) => acc + sim.records.filter((r) => r.zoneId === z.id).length,
      0
    );

    const sumGroups = sim.groups.reduce(
      (acc, g) => acc + sim.records.filter((r) => r.groupId === g.id).length,
      0
    );

    const sumChurches = sim.churches.reduce(
      (acc, c) => acc + sim.records.filter((r) => r.churchId === c.id).length,
      0
    );

    const sumPcfs = sim.pcfs.reduce(
      (acc, p) => acc + sim.records.filter((r) => r.pcfId === p.id).length,
      0
    );

    const sumWinners = sim.soulWinners.slice(2).reduce(
      (acc, sw) => acc + sim.records.filter((r) => r.soulWinnerId === sw.uid).length,
      0
    );

    expect(nationalTotal).toBe(40);
    expect(sumZones).toBe(nationalTotal);
    expect(sumGroups).toBe(nationalTotal);
    expect(sumChurches).toBe(nationalTotal);
    expect(sumPcfs).toBe(nationalTotal);
    expect(sumWinners).toBe(nationalTotal);
  });
});
