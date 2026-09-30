import { useState, useEffect, useCallback } from 'react';
import type { SoulWinningRecord, FormSubmissionData } from '../types/record';
import { saveLocalRecord, getAllLocalRecords } from '../services/indexedDbService';
import { syncPendingRecords, subscribeToSyncStatus, notifyRecordChanges } from '../services/syncService';
import { generateUUID } from '../utils/uuid';
import { isValidPhoneNumber, isNonEmptyText } from '../utils/validation';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuth } from '../context/AuthContext';
import { getLocalEventConfig } from '../services/eventService';

export interface SubmissionResult {
  success: boolean;
  record?: SoulWinningRecord;
  isOfflineSubmitted: boolean;
  errors?: Record<string, string>;
}

export function useSoulRecords() {
  const [records, setRecords] = useState<SoulWinningRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSubmissionStatus, setLastSubmissionStatus] = useState<
    'idle' | 'recorded_offline' | 'synced'
  >('idle');

  const { isOnline } = useNetworkStatus();
  const { soulWinnerProfile, isActiveSoulWinner, status } = useAuth();

  const loadRecords = useCallback(async () => {
    try {
      const items = await getAllLocalRecords();
      setRecords(items);
    } catch (err) {
      console.error('Error loading local records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();

    const unsubscribe = subscribeToSyncStatus(({ updatedRecords }) => {
      setRecords(updatedRecords);
    });

    if (isOnline) {
      syncPendingRecords();
    }

    return () => unsubscribe();
  }, [loadRecords, isOnline]);

  const submitRecord = async (formData: FormSubmissionData): Promise<SubmissionResult> => {
    const errors: Record<string, string> = {};

    // Verify event lock status
    const eventConfig = getLocalEventConfig();
    if (eventConfig.status === 'completed') {
      errors.general = 'EVENT COMPLETED: Soul recording for this event is now closed.';
      return { success: false, errors, isOfflineSubmitted: !navigator.onLine };
    }

    // Verify account status
    if (!isActiveSoulWinner) {
      if (status === 'pendingAssignment') {
        errors.general = 'Your account is currently pending PCF organizational assignment. Recording souls will be enabled once assigned by your PCF leader or Church manager.';
      } else if (status === 'suspended' || status === 'disabled') {
        errors.general = 'Your account is currently suspended or disabled. Recording is unavailable.';
      } else {
        errors.general = 'Please log in to an active Soul Winner account to record souls.';
      }
      return { success: false, errors, isOfflineSubmitted: !navigator.onLine };
    }

    if (!isNonEmptyText(formData.name)) {
      errors.name = "Please enter the person's name.";
    }

    if (!isNonEmptyText(formData.phone)) {
      errors.phone = "Please enter a valid phone number.";
    } else if (!isValidPhoneNumber(formData.phone)) {
      errors.phone = "Please enter a valid phone number.";
    }

    // Location is optional and falls back to church name or default outreach location
    const effectiveLocation = formData.location?.trim() || soulWinnerProfile?.churchName || 'Church Outreach';

    if (Object.keys(errors).length > 0) {
      return { success: false, errors, isOfflineSubmitted: !navigator.onLine };
    }

    setIsSubmitting(true);
    setLastSubmissionStatus('idle');

    try {
      const nowIso = new Date().toISOString();
      const newRecord: SoulWinningRecord = {
        id: generateUUID(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        location: effectiveLocation,
        isBornAgain: formData.isBornAgain ?? true,
        isFilledWithHolySpirit: formData.isFilledWithHolySpirit ?? true,
        createdAt: nowIso,
        clientCreatedAt: nowIso,
        syncStatus: 'pending',

        // Automatically attached organizational references from active Soul Winner profile
        soulWinnerId: soulWinnerProfile?.userId || soulWinnerProfile?.id,
        pcfId: soulWinnerProfile?.pcfId,
        churchId: soulWinnerProfile?.churchId,
        churchName: soulWinnerProfile?.churchName,
        groupId: soulWinnerProfile?.groupId,
        groupName: soulWinnerProfile?.groupName,
        zoneId: soulWinnerProfile?.zoneId || 'zone-abuja-1',
        zoneName: soulWinnerProfile?.zoneName || 'Abuja Zone 1',
        // Reference the live event config rather than a hardcoded string
        eventId: eventConfig.id,
      };

      // 1. Save locally immediately with organizational references intact
      await saveLocalRecord(newRecord);
      await notifyRecordChanges();
      await loadRecords();

      const wasOffline = !navigator.onLine;
      if (wasOffline) {
        setLastSubmissionStatus('recorded_offline');
      }

      // 2. Attempt cloud sync if online
      if (!wasOffline) {
        syncPendingRecords().then(({ syncedCount }) => {
          if (syncedCount > 0) {
            setLastSubmissionStatus('synced');
          }
        });
      }

      return {
        success: true,
        record: newRecord,
        isOfflineSubmitted: wasOffline,
      };
    } catch (err) {
      console.error('Submission failed:', err);
      return {
        success: false,
        errors: { general: 'Failed to save submission locally.' },
        isOfflineSubmitted: !navigator.onLine,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const manualSync = async () => {
    return syncPendingRecords();
  };

  const pendingRecordsCount = records.filter((r) => r.syncStatus === 'pending').length;
  const syncedRecordsCount = records.filter((r) => r.syncStatus === 'synced').length;

  return {
    records,
    isLoading,
    isSubmitting,
    lastSubmissionStatus,
    pendingRecordsCount,
    syncedRecordsCount,
    submitRecord,
    manualSync,
  };
}
