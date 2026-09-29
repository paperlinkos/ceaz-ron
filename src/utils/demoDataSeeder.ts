import { saveLocalRecord } from '../services/indexedDbService';
import { REACH_OUT_NIGERIA_EVENT } from '../config/eventConfig';
import type { SoulWinningRecord } from '../types/record';
import type { Target } from '../types/target';

export const DEMO_HIERARCHY = {
  zone: { id: 'zone-abuja-1', name: 'Abuja Zone 1', code: 'ABZ1', status: 'active' as const, createdAt: new Date().toISOString() },
  groups: [
    { id: 'grp-gwarinpa', zoneId: 'zone-abuja-1', name: 'Gwarinpa Group', code: 'GRP-GWR', status: 'active' as const, createdAt: new Date().toISOString() },
    { id: 'grp-central', zoneId: 'zone-abuja-1', name: 'Central Group', code: 'GRP-CEN', status: 'active' as const, createdAt: new Date().toISOString() },
    { id: 'grp-wuse', zoneId: 'zone-abuja-1', name: 'Wuse Group', code: 'GRP-WUS', status: 'active' as const, createdAt: new Date().toISOString() },
  ],
  churches: [
    { id: 'ch-gwarinpa1', groupId: 'grp-gwarinpa', name: 'CE Gwarinpa 1', code: 'CH-GWR1', status: 'active' as const, createdAt: new Date().toISOString() },
    { id: 'ch-cathedral', groupId: 'grp-central', name: 'Abuja Cathedral', code: 'CH-CATH', status: 'active' as const, createdAt: new Date().toISOString() },
    { id: 'ch-wuse', groupId: 'grp-wuse', name: 'CE Wuse', code: 'CH-WUS', status: 'active' as const, createdAt: new Date().toISOString() },
  ],
  pcfs: [],
};

export async function seedDemoData(): Promise<void> {
  // 1. Seed Organizations
  const orgCache = {
    zones: [DEMO_HIERARCHY.zone],
    groups: DEMO_HIERARCHY.groups,
    churches: DEMO_HIERARCHY.churches,
    pcfs: DEMO_HIERARCHY.pcfs,
  };
  localStorage.setItem('ron_organizations_cache', JSON.stringify(orgCache));

  // 2. Seed Targets
  const now = new Date().toISOString();
  const targets: Target[] = [
    {
      id: `${REACH_OUT_NIGERIA_EVENT.id}_zone_${DEMO_HIERARCHY.zone.id}`,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      level: 'zone',
      organizationId: DEMO_HIERARCHY.zone.id,
      target: 40000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      status: 'active',
    },
    {
      id: `${REACH_OUT_NIGERIA_EVENT.id}_group_${DEMO_HIERARCHY.groups[0].id}`,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      level: 'group',
      organizationId: DEMO_HIERARCHY.groups[0].id,
      target: 15000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      status: 'active',
    },
    {
      id: `${REACH_OUT_NIGERIA_EVENT.id}_church_${DEMO_HIERARCHY.churches[0].id}`,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      level: 'church',
      organizationId: DEMO_HIERARCHY.churches[0].id,
      target: 8000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      status: 'active',
    },
  ];
  localStorage.setItem('ron_cached_targets', JSON.stringify(targets));

  // 3. Seed Soul Records into IndexedDB
  const sampleRecords: SoulWinningRecord[] = [
    {
      id: 'demo-record-1',
      name: 'Grace Emmanuel',
      phone: '+2348011112222',
      location: 'Garki Market, Abuja',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      clientCreatedAt: new Date(Date.now() - 3600000).toISOString(),
      soulWinnerId: 'demo-soul-winner-id',
      churchId: DEMO_HIERARCHY.churches[0].id,
      groupId: DEMO_HIERARCHY.groups[0].id,
      zoneId: DEMO_HIERARCHY.zone.id,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      syncStatus: 'synced',
      syncedAt: new Date().toISOString(),
    },
    {
      id: 'demo-record-2',
      name: 'David Okeke',
      phone: '+2348033334444',
      location: 'Wuse 2, Abuja',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      clientCreatedAt: new Date(Date.now() - 7200000).toISOString(),
      soulWinnerId: 'demo-soul-winner-id',
      churchId: DEMO_HIERARCHY.churches[0].id,
      groupId: DEMO_HIERARCHY.groups[0].id,
      zoneId: DEMO_HIERARCHY.zone.id,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      syncStatus: 'synced',
      syncedAt: new Date().toISOString(),
    },
    {
      id: 'demo-record-3',
      name: 'Chidinma Adebayo',
      phone: '+2348055556666',
      location: 'Maitama, Abuja',
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      clientCreatedAt: new Date(Date.now() - 10800000).toISOString(),
      soulWinnerId: 'demo-soul-winner-id',
      churchId: DEMO_HIERARCHY.churches[0].id,
      groupId: DEMO_HIERARCHY.groups[0].id,
      zoneId: DEMO_HIERARCHY.zone.id,
      eventId: REACH_OUT_NIGERIA_EVENT.id,
      syncStatus: 'synced',
      syncedAt: new Date().toISOString(),
    },
  ];

  for (const rec of sampleRecords) {
    await saveLocalRecord(rec);
  }
}
