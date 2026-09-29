export type UserRole =
  | 'superAdmin'
  | 'zoneManager'
  | 'groupManager'
  | 'churchManager'
  | 'pcfLeader'
  | 'soulWinner';

export type AccountStatus =
  | 'pendingAssignment'
  | 'active'
  | 'suspended'
  | 'disabled';

export interface UserProfile {
  id: string;               // Auth UID
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SoulWinnerProfile {
  id: string;               // Auth UID / SoulWinner ID
  userId: string;
  pcfId?: string;
  churchId?: string;
  groupId?: string;
  zoneId?: string;
  pcfName?: string;
  churchName?: string;
  groupName?: string;
  zoneName?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}
