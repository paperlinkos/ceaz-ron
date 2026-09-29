export type EntityStatus = 'active' | 'inactive';

export interface Zone {
  id: string;
  name: string;
  code: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Church {
  id: string;
  name: string;
  code: string;
  groupId: string;
  status: EntityStatus;
  createdAt: string;
}

export interface PCF {
  id: string;
  name: string;
  code: string;
  churchId: string;
  status: EntityStatus;
  createdAt: string;
}
