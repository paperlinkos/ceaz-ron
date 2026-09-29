export type ImportType = 'organization' | 'soul_winner';
export type ImportMode = 'create_only' | 'create_and_update';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CSVOrganizationRow {
  zoneName: string;
  zoneCode: string;
  groupName?: string;
  groupCode?: string;
  churchName?: string;
  churchCode?: string;
  pcfName?: string;
  pcfCode?: string;
}

export interface CSVSoulWinnerRow {
  name: string;
  email: string;
  pcfCode: string;
}

export interface ImportErrorDetail {
  rowIndex: number;
  field: string;
  value: string;
  error: string;
}

export interface ImportValidationResult {
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  errors: ImportErrorDetail[];
  preview: {
    zonesNew: number;
    zonesExisting: number;
    groupsNew: number;
    groupsExisting: number;
    churchesNew: number;
    churchesExisting: number;
    pcfsNew: number;
    pcfsExisting: number;
    soulWinnersNew: number;
    soulWinnersExisting: number;
  };
  validatedOrgRows?: CSVOrganizationRow[];
  validatedSoulWinnerRows?: CSVSoulWinnerRow[];
}

export interface ImportHistoryRecord {
  id: string;
  type: ImportType;
  fileName: string;
  actorId: string;
  actorName?: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  status: ImportStatus;
  timestamp: string;
}
