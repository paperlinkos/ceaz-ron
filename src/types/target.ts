export type TargetLevel = 'zone' | 'group' | 'church' | 'pcf';

export interface Target {
  id: string;
  eventId: string;
  level: TargetLevel;
  organizationId: string;
  target: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: 'active' | 'inactive';
}

export interface OrganizationProgress {
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
  level: TargetLevel;
  actual: number;
  target: number;
  percentage: number;
  normalizedProgress: number; // Value 0.0 - 1.0 for visual height rendering
  isTargetExceeded: boolean;
  hasTarget: boolean;
  displayPercentage: string;
}

export interface TargetFormData {
  level: TargetLevel;
  organizationId: string;
  target: number;
}
