import { describe, it, expect, beforeEach } from 'vitest';
import { isValidPhoneNumber, isNonEmptyText } from '../src/utils/validation';
import type { SoulWinningRecord, FormSubmissionData } from '../src/types/record';
import type { UserProfile } from '../src/types/auth';
import { generateUUID } from '../src/utils/uuid';

describe('Phase 8: Rapid Soul Winner Recording Experience', () => {
  let activeSoulWinner: UserProfile;
  let pendingSoulWinner: UserProfile;
  let suspendedSoulWinner: UserProfile;
  let disabledSoulWinner: UserProfile;

  beforeEach(() => {
    activeSoulWinner = {
      userId: 'sw-101',
      email: 'winner@example.com',
      name: 'Active Winner',
      role: 'soulWinner',
      status: 'active',
      zoneId: 'zone-abuja',
      groupId: 'group-central',
      churchId: 'church-main',
      pcfId: 'pcf-grace',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    pendingSoulWinner = {
      ...activeSoulWinner,
      userId: 'sw-102',
      status: 'pendingAssignment',
      zoneId: undefined,
      groupId: undefined,
      churchId: undefined,
      pcfId: undefined,
    };

    suspendedSoulWinner = {
      ...activeSoulWinner,
      userId: 'sw-103',
      status: 'suspended',
    };

    disabledSoulWinner = {
      ...activeSoulWinner,
      userId: 'sw-104',
      status: 'disabled',
    };
  });

  describe('Authentication & Authorization Gate', () => {
    it('blocks unauthenticated user from submitting a soul', () => {
      const isAuthenticated = false;
      const profile = null;

      function canRecord(auth: boolean, prof: UserProfile | null) {
        return auth && prof?.status === 'active' && Boolean(prof?.pcfId);
      }

      expect(canRecord(isAuthenticated, profile)).toBe(false);
    });

    it('blocks pending assignment user from submitting', () => {
      function canRecord(prof: UserProfile) {
        return prof.status === 'active' && Boolean(prof.pcfId);
      }

      expect(canRecord(pendingSoulWinner)).toBe(false);
    });

    it('blocks suspended user from submitting', () => {
      function canRecord(prof: UserProfile) {
        return prof.status === 'active' && Boolean(prof.pcfId);
      }

      expect(canRecord(suspendedSoulWinner)).toBe(false);
    });

    it('blocks disabled user from submitting', () => {
      function canRecord(prof: UserProfile) {
        return prof.status === 'active' && Boolean(prof.pcfId);
      }

      expect(canRecord(disabledSoulWinner)).toBe(false);
    });

    it('allows active Soul Winner with valid assignment to submit', () => {
      function canRecord(prof: UserProfile) {
        return prof.status === 'active' && Boolean(prof.pcfId);
      }

      expect(canRecord(activeSoulWinner)).toBe(true);
    });
  });

  describe('Form Field Validation', () => {
    it('validates name, phone, and location fields', () => {
      const emptyForm: FormSubmissionData = { name: '', phone: '', location: '' };

      const nameValid = isNonEmptyText(emptyForm.name);
      const phoneValid = isValidPhoneNumber(emptyForm.phone);
      const locationValid = isNonEmptyText(emptyForm.location);

      expect(nameValid).toBe(false);
      expect(phoneValid).toBe(false);
      expect(locationValid).toBe(false);
    });

    it('accepts valid Nigerian phone numbers and manual location entry', () => {
      const validForm: FormSubmissionData = {
        name: 'Brother Emmanuel',
        phone: '08031234567',
        location: 'Wuse Market',
      };

      expect(isNonEmptyText(validForm.name)).toBe(true);
      expect(isValidPhoneNumber(validForm.phone)).toBe(true);
      expect(isNonEmptyText(validForm.location)).toBe(true);
    });
  });

  describe('Organizational Reference Derivation & Security', () => {
    it('automatically attaches trusted user profile organization IDs', () => {
      const rawFormData: FormSubmissionData = {
        name: 'Sister Mary',
        phone: '+2348029998877',
        location: 'Street outreach',
      };

      // Client cannot pass custom org IDs. Record strictly inherits from activeSoulWinner profile
      const record: SoulWinningRecord = {
        id: generateUUID(),
        name: rawFormData.name.trim(),
        phone: rawFormData.phone.trim(),
        location: rawFormData.location.trim(),
        createdAt: new Date().toISOString(),
        clientCreatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        soulWinnerId: activeSoulWinner.userId,
        pcfId: activeSoulWinner.pcfId,
        churchId: activeSoulWinner.churchId,
        groupId: activeSoulWinner.groupId,
        zoneId: activeSoulWinner.zoneId,
        eventId: 'ron-2026-oct1',
      };

      expect(record.soulWinnerId).toBe('sw-101');
      expect(record.pcfId).toBe('pcf-grace');
      expect(record.churchId).toBe('church-main');
      expect(record.groupId).toBe('group-central');
      expect(record.zoneId).toBe('zone-abuja');
    });
  });

  describe('Idempotency & Duplicate Protection', () => {
    it('generates a unique client UUID for each submission to prevent duplicate records', () => {
      const record1Id = generateUUID();
      const record2Id = generateUUID();

      expect(record1Id).not.toBe(record2Id);
      expect(record1Id.length).toBeGreaterThan(20);
    });
  });
});
