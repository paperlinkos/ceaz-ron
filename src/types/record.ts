export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface SoulWinningRecord {
  /** Unique client-generated ID (UUID v4) used as Firestore Document ID for idempotency */
  id: string;

  /** Name of the soul won */
  name: string;

  /** Validated phone number of the soul won */
  phone: string;

  /** Description of location where met (e.g. Wuse Market, Church, Airport Road) */
  location: string;

  /** Timestamp ISO string when record was created */
  createdAt: string;

  /** Timestamp ISO string when created on client device */
  clientCreatedAt: string;

  /** Local sync status */
  syncStatus: SyncStatus;

  /** Timestamp ISO string when successfully synced to Firestore */
  syncedAt?: string;

  /** Last error message if sync failed */
  syncError?: string;

  // Spiritual status
  isBornAgain?: boolean;
  isFilledWithHolySpirit?: boolean;

  // Organizational hierarchy references automatically attached from Soul Winner profile
  soulWinnerId?: string;
  pcfId?: string;
  churchId?: string;
  groupId?: string;
  zoneId?: string;

  // Event reference
  eventId?: string;
  notes?: string;

  churchName?: string;
  groupName?: string;
  zoneName?: string;
}

export interface FormSubmissionData {
  name: string;
  phone: string;
  location: string;
  isBornAgain?: boolean;
  isFilledWithHolySpirit?: boolean;
}
