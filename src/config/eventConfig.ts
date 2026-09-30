export type EventStatus = 'upcoming' | 'live' | 'completed';

export interface MilestoneConfig {
  id: string;
  percentage: number;
  label: string;
  badge?: string;
  description?: string;
}

export interface CelebrationTrigger {
  id: string;
  timestamp: number;
  type: 'manual' | 'milestone' | 'church_milestone' | 'group_milestone';
  entityType?: 'church' | 'group' | 'zone';
  entityId?: string;
  entityName?: string;
  groupName?: string;
  milestoneValue?: number;
  actual?: number;
  target?: number;
  percentage?: number;
  headline?: string;
  message?: string;
  triggeredBy?: string;
}

export interface MilestoneAlert {
  id: string;
  eventId: string;
  entityType: 'church' | 'group';
  entityId: string;
  entityName: string;
  groupName?: string;
  milestoneType: 'percentage' | 'volume';
  milestoneValue: number; // e.g. 50, 75, 100, 150 (percentage) or 1000, 5000 (volume)
  actual: number;
  target: number;
  percentage: number;
  headline: string;
  subheadline: string;
  timestamp: number;
  status: 'pending' | 'released' | 'dismissed';
  releasedAt?: number;
  releasedBy?: string;
}


export interface EventConfig {
  id: string;
  name: string;
  eventDate: string;
  target: number;
  status: EventStatus;
  startAt?: string;
  endAt?: string;
  updatedAt: string;
  description?: string;
  personalTargetDefault?: number;
  raceThresholdYellow?: number;
  raceThresholdGreen?: number;
  locationPresets?: string[];
  milestones?: MilestoneConfig[];
  announcements?: string[];
  milestoneInterval?: number; // e.g. every 10,000 souls won
  zonalMilestones?: number[]; // e.g. [10000, 20000, 30000, 40000, 50000]
  lastCelebrationTrigger?: CelebrationTrigger;
  countdownTimerEnabled?: boolean;
}

export interface EventAuditLog {
  id: string;
  eventId: string;
  action: 'event_started' | 'event_ended' | 'settings_updated';
  actorId: string;
  timestamp: string;
  details?: string;
}

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { id: 'm-25', percentage: 25, label: 'Bronze Catalyst', badge: '🥉', description: 'Initial wave ignited across all groups' },
  { id: 'm-50', percentage: 50, label: 'Silver Stride', badge: '🥈', description: 'Halfway mark reached — momentum surging' },
  { id: 'm-75', percentage: 75, label: 'Golden Harvest', badge: '🥇', description: 'Over three quarters conquered' },
  { id: 'm-100', percentage: 100, label: 'Victory Crown', badge: '👑', description: 'Campaign target 100% fulfilled!' },
  { id: 'm-125', percentage: 125, label: 'Super Abundance', badge: '🌟', description: 'Target shattered into overflowing increase' },
];

export const DEFAULT_LOCATION_PRESETS: string[] = [
  'Wuse Market',
  'Gwarinpa',
  'Church',
  'Street outreach',
  'University',
  'Workplace',
  'Personal contact',
  'Hospital / Clinic',
  'Motor Park / Transit Hub',
  'Shopping Mall / Plaza',
];

export const DEFAULT_ANNOUNCEMENTS: string[] = [
  '📢 REACH OUT NIGERIA 2026: Every soul counts! Keep recording harvest results across all 24 Groups & Churches!',
  '⚡ ZONAL VICTORY MANDATE: 50,000 Souls targeted for the Master\'s Kingdom in Abuja Zone 1!',
  '🔥 CELL LEADERS & COORDINATORS: Verify and sync all field counts as soon as outreaches conclude.',
  '👑 UPWARD RACE IN MOTION: Who will claim the #1 spot in Abuja Zone 1? Standings update live!',
];

export const DEFAULT_ZONAL_MILESTONES: number[] = [10000, 20000, 30000, 40000, 50000];

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  id: 'ron-2026-oct1',
  name: 'Reach Out Nigeria',
  eventDate: '2026-10-01',
  target: 50000,
  status: 'upcoming',
  updatedAt: new Date().toISOString(),
  description: 'CEAZ1 Reachout Nigeria Soul Winning Campaign taking place on October 1st, 2026.',
  personalTargetDefault: 20,
  raceThresholdYellow: 50,
  raceThresholdGreen: 75,
  locationPresets: DEFAULT_LOCATION_PRESETS,
  milestones: DEFAULT_MILESTONES,
  announcements: DEFAULT_ANNOUNCEMENTS,
  milestoneInterval: 10000,
  zonalMilestones: DEFAULT_ZONAL_MILESTONES,
  countdownTimerEnabled: true,
};

export const REACH_OUT_NIGERIA_EVENT = {
  ...DEFAULT_EVENT_CONFIG,
  zonalTarget: 50000,
  nationalTarget: 50000, // Retain backward-compatible alias for existing imports
  campaignDate: '2026-10-01',
};

