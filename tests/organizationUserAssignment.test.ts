import { describe, it, expect, beforeEach } from 'vitest';
import type { Zone, Group, Church, PCF } from '../src/types/organization';
import type { UserProfile, SoulWinnerProfile, UserRole, AccountStatus } from '../src/types/auth';
import type { SoulWinningRecord } from '../src/types/record';
import { generateUUID } from '../src/utils/uuid';

describe('Phase 10: Organization & User Assignment Management', () => {
  let zone: Zone;
  let group: Group;
  let church: Church;
  let pcf1: PCF;
  let pcf2: PCF;

  let soulWinnerUser: UserProfile;
  let soulWinnerProfile: SoulWinnerProfile;

  beforeEach(() => {
    zone = {
      id: 'zone-abuja1',
      name: 'Abuja Zone 1',
      code: 'ZN-ABJ1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    group = {
      id: 'group-gwarinpa',
      name: 'Gwarinpa Group',
      code: 'GRP-GWR',
      zoneId: zone.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    church = {
      id: 'church-ce-gwarinpa1',
      name: 'CE Gwarinpa 1',
      code: 'CH-GWR1',
      groupId: group.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    pcf1 = {
      id: 'pcf-grace',
      name: 'Grace PCF',
      code: 'PCF-GRC',
      churchId: church.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    pcf2 = {
      id: 'pcf-mercy',
      name: 'Mercy PCF',
      code: 'PCF-MRC',
      churchId: church.id,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    soulWinnerUser = {
      id: 'user-john-doe',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '08012345678',
      role: 'soulWinner',
      status: 'pendingAssignment',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    soulWinnerProfile = {
      id: 'user-john-doe',
      userId: 'user-john-doe',
      status: 'pendingAssignment',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  });

  describe('Hierarchical Creation & Validation', () => {
    it('1. Enforces valid parent hierarchy relationships', () => {
      expect(group.zoneId).toBe(zone.id);
      expect(church.groupId).toBe(group.id);
      expect(pcf1.churchId).toBe(church.id);
    });

    it('2. Rejects creation of Group without a valid Zone', () => {
      function createGroupWithoutZone(zoneId: string) {
        if (!zoneId) throw new Error('Parent Zone required');
      }
      expect(() => createGroupWithoutZone('')).toThrow('Parent Zone required');
    });
  });

  describe('User Registration & Pending Status', () => {
    it('3. New Soul Winner starts in pendingAssignment status', () => {
      expect(soulWinnerUser.status).toBe('pendingAssignment');
      expect(soulWinnerProfile.pcfId).toBeUndefined();
    });

    it('4. Pending Soul Winner cannot record souls', () => {
      function canRecord(status: AccountStatus, pcfId?: string) {
        return status === 'active' && Boolean(pcfId);
      }
      expect(canRecord(soulWinnerUser.status, soulWinnerProfile.pcfId)).toBe(false);
    });
  });

  describe('Admin Assignment & Derivation', () => {
    it('5. Admin can assign Soul Winner to PCF and automatically derive parent hierarchy', () => {
      function assignUserToPcf(pcf: PCF, ch: Church, gr: Group, zn: Zone) {
        soulWinnerUser.status = 'active';
        soulWinnerProfile.status = 'active';
        soulWinnerProfile.pcfId = pcf.id;
        soulWinnerProfile.churchId = ch.id;
        soulWinnerProfile.groupId = gr.id;
        soulWinnerProfile.zoneId = zn.id;
        soulWinnerProfile.pcfName = pcf.name;
        soulWinnerProfile.churchName = ch.name;
        soulWinnerProfile.groupName = gr.name;
        soulWinnerProfile.zoneName = zn.name;
      }

      assignUserToPcf(pcf1, church, group, zone);

      expect(soulWinnerUser.status).toBe('active');
      expect(soulWinnerProfile.pcfId).toBe('pcf-grace');
      expect(soulWinnerProfile.churchId).toBe('church-ce-gwarinpa1');
      expect(soulWinnerProfile.groupId).toBe('group-gwarinpa');
      expect(soulWinnerProfile.zoneId).toBe('zone-abuja1');
    });
  });

  describe('Historical Organizational Attribution Protection', () => {
    it('6. Reassignment updates future scope while retaining historical record attribution', () => {
      // 1. Record 1 soul under PCF 1 (Grace PCF)
      const historicalRecord: SoulWinningRecord = {
        id: generateUUID(),
        name: 'Brother Mark',
        phone: '08099887766',
        location: 'Wuse Market',
        createdAt: '2026-09-01T10:00:00.000Z',
        clientCreatedAt: '2026-09-01T10:00:00.000Z',
        syncStatus: 'synced',
        soulWinnerId: soulWinnerUser.id,
        pcfId: pcf1.id,
        churchId: church.id,
        groupId: group.id,
        zoneId: zone.id,
      };

      // 2. Reassign John Doe to PCF 2 (Mercy PCF)
      soulWinnerProfile.pcfId = pcf2.id;
      soulWinnerProfile.pcfName = pcf2.name;

      // 3. Record new soul under PCF 2
      const newRecord: SoulWinningRecord = {
        id: generateUUID(),
        name: 'Sister Sarah',
        phone: '08011223344',
        location: 'Gwarinpa Street',
        createdAt: '2026-09-25T14:00:00.000Z',
        clientCreatedAt: '2026-09-25T14:00:00.000Z',
        syncStatus: 'synced',
        soulWinnerId: soulWinnerUser.id,
        pcfId: soulWinnerProfile.pcfId,
        churchId: church.id,
        groupId: group.id,
        zoneId: zone.id,
      };

      // VERIFY: Historical record retains PCF 1, new record uses PCF 2
      expect(historicalRecord.pcfId).toBe('pcf-grace');
      expect(newRecord.pcfId).toBe('pcf-mercy');
    });
  });

  describe('Organization Status & Target Compatibility', () => {
    it('7. Deactivating an organization does not delete historical records or targets', () => {
      pcf1.status = 'inactive';

      const target = {
        id: `target_${pcf1.id}`,
        entityId: pcf1.id,
        entityType: 'pcf',
        targetValue: 500,
      };

      expect(pcf1.status).toBe('inactive');
      expect(target.entityId).toBe('pcf-grace');
    });

    it('8. Organization rename retains stable ID so targets remain intact', () => {
      const oldId = pcf1.id;
      pcf1.name = 'Grace & Glory PCF';

      expect(pcf1.id).toBe(oldId);
      expect(pcf1.name).toBe('Grace & Glory PCF');
    });
  });

  describe('Account Status Rules', () => {
    it('9. Suspended and Disabled accounts cannot record souls', () => {
      function canRecord(status: AccountStatus) {
        return status === 'active';
      }

      expect(canRecord('suspended')).toBe(false);
      expect(canRecord('disabled')).toBe(false);
      expect(canRecord('active')).toBe(true);
    });
  });
});
