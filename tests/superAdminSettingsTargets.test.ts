import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalEventConfig,
  setLocalEventConfig,
  updateEventConfig,
} from '../src/services/eventService';
import {
  DEFAULT_EVENT_CONFIG,
  DEFAULT_LOCATION_PRESETS,
  DEFAULT_MILESTONES,
} from '../src/config/eventConfig';
import {
  saveMultipleTargets,
  getTargets,
} from '../src/services/targetService';
import { getBarColorConfig } from '../src/components/public/UpwardRaceVisualization';

// Mock localStorage for node test runner
const memoryStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    memoryStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
  },
  clear: () => {
    Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
  },
  key: (i: number) => Object.keys(memoryStorage)[i] ?? null,
  length: 0,
} as any;

describe('Super Admin Settings, Milestones & Targets Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    setLocalEventConfig(DEFAULT_EVENT_CONFIG);
  });


  describe('Campaign & System Settings Customization', () => {
    it('initializes with default event configuration and location presets', () => {
      const config = getLocalEventConfig();
      expect(config.target).toBe(50000);
      expect(config.personalTargetDefault).toBe(20);
      expect(config.raceThresholdYellow).toBe(50);
      expect(config.raceThresholdGreen).toBe(75);
      expect(config.locationPresets).toEqual(DEFAULT_LOCATION_PRESETS);
      expect(config.milestones).toEqual(DEFAULT_MILESTONES);
    });

    it('allows Super Admin to update campaign settings, thresholds, and personal targets', async () => {
      const res = await updateEventConfig(DEFAULT_EVENT_CONFIG.id, {
        name: 'Reach Out Nigeria 2026 - Conquering Zones',
        target: 50000,
        personalTargetDefault: 25,
        raceThresholdYellow: 40,
        raceThresholdGreen: 80,
      });

      expect(res.success).toBe(true);
      expect(res.config?.name).toBe('Reach Out Nigeria 2026 - Conquering Zones');
      expect(res.config?.target).toBe(50000);
      expect(res.config?.personalTargetDefault).toBe(25);
      expect(res.config?.raceThresholdYellow).toBe(40);
      expect(res.config?.raceThresholdGreen).toBe(80);

      // Verify cached local config is updated
      const local = getLocalEventConfig();
      expect(local.target).toBe(50000);
      expect(local.personalTargetDefault).toBe(25);
    });

    it('allows Super Admin to customize celebration milestones and location presets', async () => {
      const customMilestones = [
        { id: 'm-10', percentage: 10, label: 'Ignition Tier', badge: '🔥' },
        { id: 'm-50', percentage: 50, label: 'Halfway Glory', badge: '⭐' },
        { id: 'm-100', percentage: 100, label: 'Overcoming Victor', badge: '👑' },
      ];
      const customLocations = ['Banex Plaza', 'Federal Secretariat', 'Gwarinpa Phase 2', 'Wuse Market'];

      const res = await updateEventConfig(DEFAULT_EVENT_CONFIG.id, {
        milestones: customMilestones,
        locationPresets: customLocations,
      });

      expect(res.success).toBe(true);
      expect(res.config?.milestones).toHaveLength(3);
      expect(res.config?.milestones?.[0].label).toBe('Ignition Tier');
      expect(res.config?.locationPresets).toEqual(customLocations);
    });

    it('allows Super Admin to toggle campaign countdown timer on and off', async () => {
      // Default state should be enabled
      const initial = getLocalEventConfig();
      expect(initial.countdownTimerEnabled).toBe(true);

      // Super Admin turns it OFF
      const turnOffRes = await updateEventConfig(DEFAULT_EVENT_CONFIG.id, {
        countdownTimerEnabled: false,
      });
      expect(turnOffRes.success).toBe(true);
      expect(turnOffRes.config?.countdownTimerEnabled).toBe(false);

      const cachedAfterTurnOff = getLocalEventConfig();
      expect(cachedAfterTurnOff.countdownTimerEnabled).toBe(false);

      // Super Admin turns it ON
      const turnOnRes = await updateEventConfig(DEFAULT_EVENT_CONFIG.id, {
        countdownTimerEnabled: true,
      });
      expect(turnOnRes.success).toBe(true);
      expect(turnOnRes.config?.countdownTimerEnabled).toBe(true);

      const cachedAfterTurnOn = getLocalEventConfig();
      expect(cachedAfterTurnOn.countdownTimerEnabled).toBe(true);
    });

    it('allows Super Admin to configure start time, end time, and countdown settings', async () => {
      const scheduledStart = '2026-10-01T09:00:00+01:00';
      const scheduledEnd = '2026-10-01T23:59:59+01:00';
      const countdownTarget = '2026-10-01T09:00:00+01:00';
      const countdownLabel = 'OCTOBER 1ST • 9:00 AM WAT';

      const updateRes = await updateEventConfig(DEFAULT_EVENT_CONFIG.id, {
        scheduledStartAt: scheduledStart,
        scheduledEndAt: scheduledEnd,
        countdownTargetTime: countdownTarget,
        countdownLabel: countdownLabel,
        countdownSyncWithStart: true,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.config?.scheduledStartAt).toBe(scheduledStart);
      expect(updateRes.config?.scheduledEndAt).toBe(scheduledEnd);
      expect(updateRes.config?.countdownTargetTime).toBe(countdownTarget);
      expect(updateRes.config?.countdownLabel).toBe(countdownLabel);
      expect(updateRes.config?.countdownSyncWithStart).toBe(true);

      const cached = getLocalEventConfig();
      expect(cached.scheduledStartAt).toBe(scheduledStart);
      expect(cached.scheduledEndAt).toBe(scheduledEnd);
      expect(cached.countdownTargetTime).toBe(countdownTarget);
      expect(cached.countdownLabel).toBe(countdownLabel);
    });
  });

  describe('Dynamic Race Color Thresholds', () => {
    it('applies in-progress and achieved color configs correctly', () => {
      const inProgress = getBarColorConfig(60);
      expect(inProgress.textColor).toBe('#008751');
      expect(inProgress.tierName).toBe('IN PROGRESS');

      const achieved = getBarColorConfig(105);
      expect(achieved.textColor).toBe('#d97706');
      expect(achieved.tierName).toBe('100%+ TARGET ACHIEVED');
    });
  });

  describe('Batch Target Setting for Groups and Churches', () => {
    it('allows Super Admin to save multiple targets in batch', async () => {
      const batchItems = [
        { level: 'group' as const, organizationId: 'grp-wuye-1', target: 2500 },
        { level: 'group' as const, organizationId: 'grp-gwarinpa', target: 3500 },
        { level: 'church' as const, organizationId: 'ch-ce-kbs', target: 600 },
        { level: 'church' as const, organizationId: 'ch-ce-lighthouse', target: 450 },
      ];

      const saved = await saveMultipleTargets(batchItems, 'superAdmin-123');
      expect(saved).toHaveLength(4);

      const allTargets = await getTargets();
      const wuye1 = allTargets.find((t) => t.organizationId === 'grp-wuye-1' && t.level === 'group');
      const gwarinpa = allTargets.find((t) => t.organizationId === 'grp-gwarinpa' && t.level === 'group');
      const kbs = allTargets.find((t) => t.organizationId === 'ch-ce-kbs' && t.level === 'church');
      const lighthouse = allTargets.find((t) => t.organizationId === 'ch-ce-lighthouse' && t.level === 'church');

      expect(wuye1?.target).toBe(2500);
      expect(gwarinpa?.target).toBe(3500);
      expect(kbs?.target).toBe(600);
      expect(lighthouse?.target).toBe(450);
    });
  });
});
