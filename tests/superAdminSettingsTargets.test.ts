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
      expect(config.target).toBe(40000);
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
  });

  describe('Dynamic Race Color Thresholds', () => {
    it('applies default thresholds (50% and 75%) correctly', () => {
      const under50 = getBarColorConfig(30, 50, 75);
      expect(under50.textColor).toBe('#ff453a');
      expect(under50.tierName).toBe('BELOW 50%');

      const between50and74 = getBarColorConfig(60, 50, 75);
      expect(between50and74.textColor).toBe('#ffd60a');
      expect(between50and74.tierName).toBe('50% - 74%');

      const above75 = getBarColorConfig(80, 50, 75);
      expect(above75.textColor).toBe('#00ff87');
      expect(above75.tierName).toBe('75%+');
    });

    it('respects custom Super Admin thresholds (e.g. 40% and 80%)', () => {
      const yellowThreshold = 40;
      const greenThreshold = 80;

      // 35% should be Red
      const under40 = getBarColorConfig(35, yellowThreshold, greenThreshold);
      expect(under40.textColor).toBe('#ff453a');
      expect(under40.tierName).toBe('BELOW 40%');

      // 55% should be Yellow
      const between = getBarColorConfig(55, yellowThreshold, greenThreshold);
      expect(between.textColor).toBe('#ffd60a');
      expect(between.tierName).toBe('40% - 79%');

      // 85% should be Green
      const above80 = getBarColorConfig(85, yellowThreshold, greenThreshold);
      expect(above80.textColor).toBe('#00ff87');
      expect(above80.tierName).toBe('80%+');
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
