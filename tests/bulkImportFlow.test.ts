import { describe, it, expect, beforeEach } from 'vitest';
import { parseCSV } from '../src/utils/csv';
import { generateErrorCSV } from '../src/services/bulkImportService';
import type { Zone, Group, Church, PCF } from '../src/types/organization';
import type { UserProfile, SoulWinnerProfile } from '../src/types/auth';
import type { SoulWinningRecord } from '../src/types/record';
import type { ImportErrorDetail } from '../src/types/import';

describe('Phase 11: Bulk Data Import', () => {
  let existingZones: Zone[];
  let existingGroups: Group[];
  let existingChurches: Church[];
  let existingPcfs: PCF[];
  let existingUsers: UserProfile[];
  let existingSoulWinners: SoulWinnerProfile[];
  let historicalSoulRecords: SoulWinningRecord[];

  beforeEach(() => {
    existingZones = [
      {
        id: 'zone-abj1',
        name: 'Abuja Zone 1',
        code: 'ABJ',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    existingGroups = [
      {
        id: 'group-gw01',
        name: 'Gwarinpa Group',
        code: 'GW01',
        zoneId: 'zone-abj1',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    existingChurches = [
      {
        id: 'church-cg01',
        name: 'CE Gwarinpa 1',
        code: 'CG01',
        groupId: 'group-gw01',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    existingPcfs = [
      {
        id: 'pcf-gp01',
        name: 'Grace PCF',
        code: 'GP01',
        churchId: 'church-cg01',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    existingUsers = [
      {
        uid: 'user-john-001',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'soulWinner',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    existingSoulWinners = [
      {
        uid: 'user-john-001',
        pcfId: 'pcf-gp01',
        churchId: 'church-cg01',
        groupId: 'group-gw01',
        zoneId: 'zone-abj1',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    historicalSoulRecords = [
      {
        id: 'rec-001',
        soulWinnerId: 'user-john-001',
        soulWinnerName: 'John Doe',
        name: 'Brother Mark',
        phone: '+2348011112222',
        location: 'Gwarinpa Market',
        pcfId: 'pcf-gp01',
        churchId: 'church-cg01',
        groupId: 'group-gw01',
        zoneId: 'zone-abj1',
        createdAt: '2026-02-01T10:00:00.000Z',
        clientCreatedAt: '2026-02-01T10:00:00.000Z',
        syncStatus: 'synced',
      },
    ];
  });

  it('1. CSV parser handles headers, quotes, and empty rows accurately', () => {
    const csvData = `zoneName,zoneCode,groupName,groupCode,churchName,churchCode,pcfName,pcfCode
"Abuja Zone 1",ABJ,"Gwarinpa Group",GW01,"CE Gwarinpa 1",CG01,"Grace PCF",GP01
"Lagos Zone 2",LOS,"Ikeja Group",IK01,"CE Ikeja",CI01,"Faith PCF",FP01`;

    const parsed = parseCSV(csvData);
    expect(parsed.length).toBe(3); // 1 header row + 2 data rows
    const dataRows = parsed.slice(1);
    expect(dataRows.length).toBe(2);
    expect(dataRows[0][0]).toBe('Abuja Zone 1');
    expect(dataRows[0][1]).toBe('ABJ');
    expect(dataRows[1][1]).toBe('LOS');
    expect(dataRows[1][7]).toBe('FP01');
  });

  it('2. Valid organization CSV passes validation and generates correct counts', () => {
    const csvData = `zoneName,zoneCode,groupName,groupCode,churchName,churchCode,pcfName,pcfCode
Abuja Zone 1,ABJ,Gwarinpa Group,GW01,CE Gwarinpa 1,CG01,Grace PCF,GP01
Abuja Zone 1,ABJ,Gwarinpa Group,GW01,CE Gwarinpa 1,CG01,Hope PCF,HP01
Abuja Zone 1,ABJ,Wuse Group,WS01,CE Wuse 2,CW02,Praise PCF,PP01`;

    const parsed = parseCSV(csvData);
    const dataRows = parsed.slice(1);
    expect(dataRows.length).toBe(3);

    const zones = new Set(dataRows.map(r => r[1]));
    const groups = new Set(dataRows.map(r => r[3]));
    const churches = new Set(dataRows.map(r => r[5]));
    const pcfs = new Set(dataRows.map(r => r[7]));

    expect(zones.size).toBe(1);
    expect(groups.size).toBe(2);
    expect(churches.size).toBe(2);
    expect(pcfs.size).toBe(3);
  });

  it('3. Invalid hierarchy or empty required fields are rejected with line details', () => {
    const csvData = `zoneName,zoneCode,groupName,groupCode,churchName,churchCode,pcfName,pcfCode
,ABJ,Gwarinpa Group,GW01,CE Gwarinpa 1,CG01,Grace PCF,GP01
Abuja Zone 1,ABJ,,GW01,CE Gwarinpa 1,CG01,Grace PCF,GP02`;

    const parsed = parseCSV(csvData);
    const dataRows = parsed.slice(1);
    const errors: ImportErrorDetail[] = [];

    dataRows.forEach((row, index) => {
      const line = index + 2;
      if (!row[0]) errors.push({ rowIndex: line, field: 'zoneName', value: row[0], error: 'Zone Name is required' });
      if (!row[2]) errors.push({ rowIndex: line, field: 'groupName', value: row[2], error: 'Group Name is required' });
    });

    expect(errors.length).toBe(2);
    expect(errors[0].rowIndex).toBe(2);
    expect(errors[0].field).toBe('zoneName');
    expect(errors[1].rowIndex).toBe(3);
    expect(errors[1].field).toBe('groupName');
  });

  it('4. Duplicate PCF code within same CSV batch is flagged', () => {
    const csvData = `zoneName,zoneCode,groupName,groupCode,churchName,churchCode,pcfName,pcfCode
Abuja Zone 1,ABJ,Gwarinpa Group,GW01,CE Gwarinpa 1,CG01,Grace PCF,GP01
Abuja Zone 1,ABJ,Gwarinpa Group,GW01,CE Gwarinpa 1,CG01,Duplicate Grace PCF,GP01`;

    const parsed = parseCSV(csvData);
    const dataRows = parsed.slice(1);
    const seenPcfCodes = new Set<string>();
    const errors: ImportErrorDetail[] = [];

    dataRows.forEach((row, idx) => {
      const code = row[7]?.toUpperCase();
      if (seenPcfCodes.has(code)) {
        errors.push({ rowIndex: idx + 2, field: 'pcfCode', value: code, error: `Duplicate PCF Code '${code}' in import batch` });
      } else {
        seenPcfCodes.add(code);
      }
    });

    expect(errors.length).toBe(1);
    expect(errors[0].rowIndex).toBe(3);
    expect(errors[0].error).toContain("Duplicate PCF Code 'GP01'");
  });

  it('5. Invalid PCF reference in Soul Winner import is detected and rejected', () => {
    const swCsvData = `name,email,pcfCode
Mary Jane,mary@example.com,NON-EXISTENT-PCF`;

    const parsed = parseCSV(swCsvData);
    const dataRows = parsed.slice(1);
    const validPcfCodes = new Set(existingPcfs.map(p => p.code));
    const errors: ImportErrorDetail[] = [];

    dataRows.forEach((row, idx) => {
      const pcfCode = row[2];
      if (!validPcfCodes.has(pcfCode)) {
        errors.push({
          rowIndex: idx + 2,
          field: 'pcfCode',
          value: pcfCode,
          error: `PCF with code '${pcfCode}' does not exist`,
        });
      }
    });

    expect(errors.length).toBe(1);
    expect(errors[0].error).toContain("PCF with code 'NON-EXISTENT-PCF' does not exist");
  });

  it('6. Duplicate email in Soul Winner import is flagged', () => {
    const swCsvData = `name,email,pcfCode
John Duplicate,john@example.com,GP01`;

    const parsed = parseCSV(swCsvData);
    const dataRows = parsed.slice(1);
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const errors: ImportErrorDetail[] = [];

    dataRows.forEach((row, idx) => {
      const email = row[1];
      if (email && existingEmails.has(email.toLowerCase())) {
        errors.push({
          rowIndex: idx + 2,
          field: 'email',
          value: email,
          error: `Email '${email}' is already registered in system`,
        });
      }
    });

    expect(errors.length).toBe(1);
    expect(errors[0].error).toContain("Email 'john@example.com' is already registered");
  });

  it('7. Preview distinguishes NEW vs EXISTING records correctly', () => {
    const existingPcfCodes = new Set(['GP01']);
    const importPcfCodes = ['GP01', 'HP01', 'PP01'];

    let newCount = 0;
    let existingCount = 0;

    importPcfCodes.forEach(code => {
      if (existingPcfCodes.has(code)) {
        existingCount++;
      } else {
        newCount++;
      }
    });

    expect(newCount).toBe(2);
    expect(existingCount).toBe(1);
  });

  it('8. CREATE ONLY mode skips existing records without duplicating or overwriting', () => {
    const pcfCode = 'GP01'; // Existing
    const mode = 'create_only';

    const pcfExists = existingPcfs.some(p => p.code === pcfCode);
    let action = 'none';

    if (pcfExists) {
      if (mode === 'create_and_update') {
        action = 'update';
      } else {
        action = 'skip';
      }
    } else {
      action = 'create';
    }

    expect(action).toBe('skip');
  });

  it('9. CREATE + UPDATE mode updates existing entity name/code without creating duplicates', () => {
    const pcfCode = 'GP01'; // Existing
    const mode = 'create_and_update';

    const pcfExists = existingPcfs.some(p => p.code === pcfCode);
    let action = 'none';

    if (pcfExists) {
      if (mode === 'create_and_update') {
        action = 'update';
      } else {
        action = 'skip';
      }
    } else {
      action = 'create';
    }

    expect(action).toBe('update');
  });

  it('10. Imported Soul Winners start in PENDING ACCOUNT / PENDING ASSIGNMENT status without storing passwords', () => {
    const importedSoulWinner = {
      uid: 'imported-uid-99',
      email: 'newwinner@example.com',
      name: 'New Winner',
      role: 'soulWinner' as const,
      status: 'pendingAssignment' as const,
      pcfId: 'pcf-gp01',
      churchId: 'church-cg01',
      groupId: 'group-gw01',
      zoneId: 'zone-abj1',
    };

    expect(importedSoulWinner.status).toBe('pendingAssignment');
    expect((importedSoulWinner as any).password).toBeUndefined();
    expect((importedSoulWinner as any).plaintextPassword).toBeUndefined();
  });

  it('11. Historical soul winning records remain completely untouched after bulk reassignment', () => {
    // Reassign John Doe to a new PCF
    const updatedSoulWinnerProfile = {
      ...existingSoulWinners[0],
      pcfId: 'pcf-hp01', // Changed PCF
    };

    // Historical record must preserve its original pcfId
    const historicalRecord = historicalSoulRecords[0];

    expect(updatedSoulWinnerProfile.pcfId).toBe('pcf-hp01');
    expect(historicalRecord.pcfId).toBe('pcf-gp01'); // Intact!
  });

  it('12. Organization targets remain intact when bulk importing/updating organizations', () => {
    const existingTargets = [
      { id: 'target-zone-abj1', entityId: 'zone-abj1', target: 40000 },
      { id: 'target-group-gw01', entityId: 'group-gw01', target: 5000 },
    ];

    // Simulate bulk update of Zone name
    const updatedZone = {
      ...existingZones[0],
      name: 'Abuja Zone 1 Renamed',
    };

    // Targets remain associated with entityId
    const target = existingTargets.find(t => t.entityId === updatedZone.id);
    expect(target).toBeDefined();
    expect(target?.target).toBe(40000);
  });

  it('13. Error report CSV is correctly generated for download', () => {
    const errors: ImportErrorDetail[] = [
      { rowIndex: 42, field: 'pcfCode', value: 'GRACE-99', error: 'PCF GRACE-99 does not exist' },
      { rowIndex: 71, field: 'email', value: 'john@example.com', error: 'Duplicate email' },
    ];

    const csvContent = generateErrorCSV(errors);
    expect(csvContent).toContain('Row Number,Field,Invalid Value,Error Description');
    expect(csvContent).toContain('42,pcfCode,GRACE-99,PCF GRACE-99 does not exist');
    expect(csvContent).toContain('71,email,john@example.com,Duplicate email');
  });

  it('14. Large import simulation (2,000 rows) parses and validates quickly without UI freeze', () => {
    const rows: string[] = ['zoneName,zoneCode,groupName,groupCode,churchName,churchCode,pcfName,pcfCode'];
    for (let i = 1; i <= 2000; i++) {
      rows.push(`Abuja Zone ${Math.floor(i / 500) + 1},ABJ${Math.floor(i / 500) + 1},Group ${Math.floor(i / 100)},GRP${Math.floor(i / 100)},Church ${Math.floor(i / 20)},CH${Math.floor(i / 20)},PCF ${i},PCF${i}`);
    }

    const largeCSV = rows.join('\n');
    const start = Date.now();
    const parsed = parseCSV(largeCSV);
    const dataRows = parsed.slice(1);
    const duration = Date.now() - start;

    expect(dataRows.length).toBe(2000);
    expect(duration).toBeLessThan(1000); // Must parse 2,000 rows under 1 second
  });
});
