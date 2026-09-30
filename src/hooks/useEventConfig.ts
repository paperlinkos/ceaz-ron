import { useState, useEffect, useCallback } from 'react';
import type { EventConfig, EventStatus } from '../config/eventConfig';
import {
  getEventConfig,
  subscribeToEventConfig,
  updateEventStatus,
  updateEventConfig,
  triggerLiveCelebration,
  getLocalEventConfig,
} from '../services/eventService';
import { useAuth } from '../context/AuthContext';

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  hasStarted: boolean;
}

function calculateCountdown(targetDateStr: string): CountdownTime {
  const targetTime = new Date(`${targetDateStr}T00:00:00Z`).getTime();
  const now = new Date().getTime();
  const diff = targetTime - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00d 00h 00m 00s',
      hasStarted: true,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    days,
    hours,
    minutes,
    seconds,
    formatted,
    hasStarted: false,
  };
}

export function useEventConfig() {
  const [eventConfig, setEventConfig] = useState<EventConfig>(getLocalEventConfig());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<CountdownTime>(() =>
    calculateCountdown(eventConfig.eventDate)
  );

  const { userProfile } = useAuth();

  useEffect(() => {
    let isMounted = true;

    getEventConfig().then((initial) => {
      if (isMounted) {
        setEventConfig(initial);
        setIsLoading(false);
      }
    });

    const unsubscribe = subscribeToEventConfig('ron-2026-oct1', (updated) => {
      if (isMounted) {
        setEventConfig(updated);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown(eventConfig.eventDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [eventConfig.eventDate]);

  const changeStatus = useCallback(
    async (newStatus: EventStatus): Promise<boolean> => {
      const actorId = userProfile?.id || 'superAdmin';
      const result = await updateEventStatus(eventConfig.id, newStatus, actorId);
      if (result.success && result.config) {
        setEventConfig(result.config);
        return true;
      }
      return false;
    },
    [eventConfig.id, userProfile?.id]
  );

  const saveSettings = useCallback(
    async (updates: Partial<EventConfig>): Promise<boolean> => {
      const actorId = userProfile?.id || 'superAdmin';
      const result = await updateEventConfig(eventConfig.id, updates, actorId);
      if (result.success && result.config) {
        setEventConfig(result.config);
        return true;
      }
      return false;
    },
    [eventConfig.id, userProfile?.id]
  );

  const triggerCelebration = useCallback(
    async (message?: string, milestoneValue?: number): Promise<boolean> => {
      const actorId = userProfile?.id || 'superAdmin';
      const result = await triggerLiveCelebration(eventConfig.id, {
        type: milestoneValue ? 'milestone' : 'manual',
        milestoneValue,
        message,
        actorId,
      });
      return result.success;
    },
    [eventConfig.id, userProfile?.id]
  );

  const updateMilestoneInterval = useCallback(
    async (interval: number): Promise<boolean> => {
      return saveSettings({ milestoneInterval: interval });
    },
    [saveSettings]
  );

  return {
    eventConfig,
    status: eventConfig.status,
    isUpcoming: eventConfig.status === 'upcoming',
    isLive: eventConfig.status === 'live',
    isCompleted: eventConfig.status === 'completed',
    countdown,
    isLoading,
    changeStatus,
    saveSettings,
    triggerCelebration,
    updateMilestoneInterval,
  };
}
