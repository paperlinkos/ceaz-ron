import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { parseCSV, generateCSV } from '../utils/csv';
import type {
  CSVOrganizationRow,
  CSVSoulWinnerRow,
  ImportErrorDetail,
  ImportValidationResult,
  ImportHistoryRecord,
  ImportMode,
} from '../types/import';
import {
  getZones,
  getGroups,
  getChurches,
  getPCFs,
  resolvePCFHierarchy,
} from './organizationService';
import { getAllUsers, writeAdminAuditLog } from './userService';
import type { Zone, Group, Church, PCF } from '../types/organization';
import type { UserProfile, SoulWinnerProfile } from '../types/auth';
import { generateUUID } from '../utils/uuid';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Helper: Generate downloadable Error CSV */
export function generateErrorCSV(errors: ImportErrorDetail[]): string {
  const headers = ['Row Number', 'Field', 'Invalid Value', 'Error Description'];
  const rows = errors.map((e) => [
    String(e.rowIndex),
    e.field,
    e.value,
    e.error,
  ]);
  return generateCSV(headers, rows);
}

/** Validate Organization CSV file prior to import */
export async function validateOrganizationCSV(csvText: string): Promise<ImportValidationResult> {
  const rawRows = parseCSV(csvText);
  if (rawRows.length < 2) {
    return {
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 1,
      errors: [
        {
          rowIndex: 1,
          field: 'file',
          value: '',
          error: 'CSV file must contain a header row and at least one data row.',
        },
      ],
      preview: {
        zonesNew: 0,
        zonesExisting: 0,
        groupsNew: 0,
        groupsExisting: 0,
        churchesNew: 0,
        churchesExisting: 0,
        pcfsNew: 0,
        pcfsExisting: 0,
        soulWinnersNew: 0,
        soulWinnersExisting: 0,
      },
    };
  }

  const [zList, gList, cList, pList] = await Promise.all([
    getZones(),
    getGroups(),
    getChurches(),
    getPCFs(),
  ]);

  const existingZoneCodes = new Set(zList.map((z) => z.code.toUpperCase()));
  const existingGroupCodes = new Set(gList.map((g) => g.code.toUpperCase()));
  const existingChurchCodes = new Set(cList.map((c) => c.code.toUpperCase()));
  const existingPcfCodes = new Set(pList.map((p) => p.code.toUpperCase()));

  const seenZoneCodes = new Set<string>();
  const seenGroupCodes = new Set<string>();
  const seenChurchCodes = new Set<string>();
  const seenPcfCodes = new Set<string>();

  const errors: ImportErrorDetail[] = [];
  const validatedOrgRows: CSVOrganizationRow[] = [];

  let zonesNew = 0;
  let zonesExisting = 0;
  let groupsNew = 0;
  let groupsExisting = 0;
  let churchesNew = 0;
  let churchesExisting = 0;
  let pcfsNew = 0;
  let pcfsExisting = 0;

  const dataRows = rawRows.slice(1);

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed (header is line 1)
    const [
      zoneName = '',
      zoneCode = '',
      groupName = '',
      groupCode = '',
      churchName = '',
      churchCode = '',
      pcfName = '',
      pcfCode = '',
    ] = row;

    let rowValid = true;

    // 1. Zone Validation
    if (!zoneName.trim()) {
      errors.push({ rowIndex: rowNum, field: 'zoneName', value: zoneName, error: 'Zone Name is required.' });
      rowValid = false;
    }
    if (!zoneCode.trim()) {
      errors.push({ rowIndex: rowNum, field: 'zoneCode', value: zoneCode, error: 'Zone Code is required.' });
      rowValid = false;
    } else {
      const zCodeUpper = zoneCode.trim().toUpperCase();
      if (!seenZoneCodes.has(zCodeUpper)) {
        seenZoneCodes.add(zCodeUpper);
        if (existingZoneCodes.has(zCodeUpper)) {
          zonesExisting++;
        } else {
          zonesNew++;
        }
      }
    }

    // 2. Group Validation
    if (groupCode.trim() || groupName.trim()) {
      if (!groupName.trim()) {
        errors.push({ rowIndex: rowNum, field: 'groupName', value: groupName, error: 'Group Name is required when Group Code is provided.' });
        rowValid = false;
      }
      if (!groupCode.trim()) {
        errors.push({ rowIndex: rowNum, field: 'groupCode', value: groupCode, error: 'Group Code is required when Group Name is provided.' });
        rowValid = false;
      } else {
        const gCodeUpper = groupCode.trim().toUpperCase();
        if (!seenGroupCodes.has(gCodeUpper)) {
          seenGroupCodes.add(gCodeUpper);
          if (existingGroupCodes.has(gCodeUpper)) {
            groupsExisting++;
          } else {
            groupsNew++;
          }
        }
      }
    }

    // 3. Church Validation
    if (churchCode.trim() || churchName.trim()) {
      if (!groupCode.trim()) {
        errors.push({ rowIndex: rowNum, field: 'groupCode', value: '', error: 'Group Code must be provided for a Church.' });
        rowValid = false;
      }
      if (!churchName.trim()) {
        errors.push({ rowIndex: rowNum, field: 'churchName', value: churchName, error: 'Church Name is required when Church Code is provided.' });
        rowValid = false;
      }
      if (!churchCode.trim()) {
        errors.push({ rowIndex: rowNum, field: 'churchCode', value: churchCode, error: 'Church Code is required when Church Name is provided.' });
        rowValid = false;
      } else {
        const cCodeUpper = churchCode.trim().toUpperCase();
        if (!seenChurchCodes.has(cCodeUpper)) {
          seenChurchCodes.add(cCodeUpper);
          if (existingChurchCodes.has(cCodeUpper)) {
            churchesExisting++;
          } else {
            churchesNew++;
          }
        }
      }
    }

    // 4. PCF Validation
    if (pcfCode.trim() || pcfName.trim()) {
      if (!churchCode.trim()) {
        errors.push({ rowIndex: rowNum, field: 'churchCode', value: '', error: 'Church Code must be provided for a PCF.' });
        rowValid = false;
      }
      if (!pcfName.trim()) {
        errors.push({ rowIndex: rowNum, field: 'pcfName', value: pcfName, error: 'PCF Name is required when PCF Code is provided.' });
        rowValid = false;
      }
      if (!pcfCode.trim()) {
        errors.push({ rowIndex: rowNum, field: 'pcfCode', value: pcfCode, error: 'PCF Code is required when PCF Name is provided.' });
        rowValid = false;
      } else {
        const pCodeUpper = pcfCode.trim().toUpperCase();
        if (!seenPcfCodes.has(pCodeUpper)) {
          seenPcfCodes.add(pCodeUpper);
          if (existingPcfCodes.has(pCodeUpper)) {
            pcfsExisting++;
          } else {
            pcfsNew++;
          }
        }
      }
    }

    if (rowValid) {
      validatedOrgRows.push({
        zoneName: zoneName.trim(),
        zoneCode: zoneCode.trim().toUpperCase(),
        groupName: groupName.trim() || undefined,
        groupCode: groupCode.trim() ? groupCode.trim().toUpperCase() : undefined,
        churchName: churchName.trim() || undefined,
        churchCode: churchCode.trim() ? churchCode.trim().toUpperCase() : undefined,
        pcfName: pcfName.trim() || undefined,
        pcfCode: pcfCode.trim() ? pcfCode.trim().toUpperCase() : undefined,
      });
    }
  });

  return {
    totalRows: dataRows.length,
    validRowsCount: validatedOrgRows.length,
    errorRowsCount: dataRows.length - validatedOrgRows.length,
    errors,
    preview: {
      zonesNew,
      zonesExisting,
      groupsNew,
      groupsExisting,
      churchesNew,
      churchesExisting,
      pcfsNew,
      pcfsExisting,
      soulWinnersNew: 0,
      soulWinnersExisting: 0,
    },
    validatedOrgRows,
  };
}

/** Validate Soul Winner CSV file prior to import */
export async function validateSoulWinnerCSV(csvText: string): Promise<ImportValidationResult> {
  const rawRows = parseCSV(csvText);
  if (rawRows.length < 2) {
    return {
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 1,
      errors: [
        {
          rowIndex: 1,
          field: 'file',
          value: '',
          error: 'CSV file must contain a header row and at least one data row.',
        },
      ],
      preview: {
        zonesNew: 0,
        zonesExisting: 0,
        groupsNew: 0,
        groupsExisting: 0,
        churchesNew: 0,
        churchesExisting: 0,
        pcfsNew: 0,
        pcfsExisting: 0,
        soulWinnersNew: 0,
        soulWinnersExisting: 0,
      },
    };
  }

  const [pList, uList] = await Promise.all([getPCFs(), getAllUsers()]);
  const pcfMap = new Map<string, PCF>();
  pList.forEach((p) => pcfMap.set(p.code.toUpperCase(), p));

  const existingEmails = new Set(uList.map((u) => u.email.toLowerCase()));
  const seenEmails = new Set<string>();

  const errors: ImportErrorDetail[] = [];
  const validatedSoulWinnerRows: CSVSoulWinnerRow[] = [];

  let soulWinnersNew = 0;
  let soulWinnersExisting = 0;

  const dataRows = rawRows.slice(1);

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const [name = '', email = '', pcfCode = ''] = row;

    let rowValid = true;

    if (!name.trim()) {
      errors.push({ rowIndex: rowNum, field: 'name', value: name, error: 'Soul Winner Name is required.' });
      rowValid = false;
    }

    if (!email.trim()) {
      errors.push({ rowIndex: rowNum, field: 'email', value: email, error: 'Email is required.' });
      rowValid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.push({ rowIndex: rowNum, field: 'email', value: email, error: 'Please enter a valid email address.' });
      rowValid = false;
    } else {
      const emailLower = email.trim().toLowerCase();
      if (seenEmails.has(emailLower)) {
        errors.push({ rowIndex: rowNum, field: 'email', value: email, error: 'Duplicate email within the same upload file.' });
        rowValid = false;
      } else {
        seenEmails.add(emailLower);
        if (existingEmails.has(emailLower)) {
          soulWinnersExisting++;
        } else {
          soulWinnersNew++;
        }
      }
    }

    if (!pcfCode.trim()) {
      errors.push({ rowIndex: rowNum, field: 'pcfCode', value: pcfCode, error: 'PCF Code is required.' });
      rowValid = false;
    } else {
      const pCodeUpper = pcfCode.trim().toUpperCase();
      if (!pcfMap.has(pCodeUpper)) {
        errors.push({ rowIndex: rowNum, field: 'pcfCode', value: pcfCode, error: `PCF with code "${pCodeUpper}" does not exist in campaign database.` });
        rowValid = false;
      }
    }

    if (rowValid) {
      validatedSoulWinnerRows.push({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        pcfCode: pcfCode.trim().toUpperCase(),
      });
    }
  });

  return {
    totalRows: dataRows.length,
    validRowsCount: validatedSoulWinnerRows.length,
    errorRowsCount: dataRows.length - validatedSoulWinnerRows.length,
    errors,
    preview: {
      zonesNew: 0,
      zonesExisting: 0,
      groupsNew: 0,
      groupsExisting: 0,
      churchesNew: 0,
      churchesExisting: 0,
      pcfsNew: 0,
      pcfsExisting: 0,
      soulWinnersNew,
      soulWinnersExisting,
    },
    validatedSoulWinnerRows,
  };
}

/** SuperAdmin function: Execute Bulk Organization Import */
export async function executeOrganizationImport(
  target: ImportValidationResult | CSVOrganizationRow[],
  mode: ImportMode,
  actorId: string,
  arg4: string,
  arg5?: string | ((pct: number) => void),
  arg6?: (pct: number) => void
): Promise<ImportHistoryRecord> {
  const validatedRows: CSVOrganizationRow[] = Array.isArray(target)
    ? target
    : target.validatedOrgRows || [];
  const totalRowsCount = Array.isArray(target) ? target.length : target.totalRows;

  let actorName = '';
  let fileName = '';
  let onProgress: ((pct: number) => void) | undefined;

  if (typeof arg5 === 'function') {
    fileName = arg4;
    onProgress = arg5;
  } else if (typeof arg5 === 'string') {
    actorName = arg4;
    fileName = arg5;
    onProgress = arg6;
  } else {
    fileName = arg4;
  }

  const importId = generateUUID();
  const startedAt = new Date().toISOString();

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errorCount = 0;

  const [zList, gList, cList, pList] = await Promise.all([
    getZones(),
    getGroups(),
    getChurches(),
    getPCFs(),
  ]);

  const zoneMap = new Map<string, Zone>();
  zList.forEach((z) => zoneMap.set(z.code.toUpperCase(), z));

  const groupMap = new Map<string, Group>();
  gList.forEach((g) => groupMap.set(`${g.zoneId}_${g.code.toUpperCase()}`, g));

  const churchMap = new Map<string, Church>();
  cList.forEach((c) => churchMap.set(`${c.groupId}_${c.code.toUpperCase()}`, c));

  const pcfMap = new Map<string, PCF>();
  pList.forEach((p) => pcfMap.set(`${p.churchId}_${p.code.toUpperCase()}`, p));

  const total = validatedRows.length;

  for (let i = 0; i < total; i++) {
    const row = validatedRows[i];

    // 1. Zone
    let zoneObj = zoneMap.get(row.zoneCode);
    if (!zoneObj) {
      const newZone: Zone = {
        id: `zone_${generateUUID()}`,
        name: row.zoneName,
        code: row.zoneCode,
        status: 'active',
        createdAt: startedAt,
      };
      if (navigator.onLine) await setDoc(doc(db, 'zones', newZone.id), newZone);
      zoneMap.set(row.zoneCode, newZone);
      zoneObj = newZone;
      createdCount++;
    } else if (mode === 'create_and_update' && zoneObj.name !== row.zoneName) {
      zoneObj.name = row.zoneName;
      if (navigator.onLine) await updateDoc(doc(db, 'zones', zoneObj.id), { name: row.zoneName });
      updatedCount++;
    } else {
      skippedCount++;
    }

    // 2. Group
    if (row.groupCode && row.groupName) {
      const gKey = `${zoneObj.id}_${row.groupCode}`;
      let groupObj = groupMap.get(gKey);

      if (!groupObj) {
        const newGroup: Group = {
          id: `group_${generateUUID()}`,
          name: row.groupName,
          code: row.groupCode,
          zoneId: zoneObj.id,
          status: 'active',
          createdAt: startedAt,
        };
        if (navigator.onLine) await setDoc(doc(db, 'groups', newGroup.id), newGroup);
        groupMap.set(gKey, newGroup);
        groupObj = newGroup;
        createdCount++;
      } else if (mode === 'create_and_update' && groupObj.name !== row.groupName) {
        groupObj.name = row.groupName;
        if (navigator.onLine) await updateDoc(doc(db, 'groups', groupObj.id), { name: row.groupName });
        updatedCount++;
      } else {
        skippedCount++;
      }

      // 3. Church
      if (row.churchCode && row.churchName) {
        const cKey = `${groupObj.id}_${row.churchCode}`;
        let churchObj = churchMap.get(cKey);

        if (!churchObj) {
          const newChurch: Church = {
            id: `church_${generateUUID()}`,
            name: row.churchName,
            code: row.churchCode,
            groupId: groupObj.id,
            status: 'active',
            createdAt: startedAt,
          };
          if (navigator.onLine) await setDoc(doc(db, 'churches', newChurch.id), newChurch);
          churchMap.set(cKey, newChurch);
          churchObj = newChurch;
          createdCount++;
        } else if (mode === 'create_and_update' && churchObj.name !== row.churchName) {
          churchObj.name = row.churchName;
          if (navigator.onLine) await updateDoc(doc(db, 'churches', churchObj.id), { name: row.churchName });
          updatedCount++;
        } else {
          skippedCount++;
        }

        // 4. PCF
        if (row.pcfCode && row.pcfName) {
          const pKey = `${churchObj.id}_${row.pcfCode}`;
          let pcfObj = pcfMap.get(pKey);

          if (!pcfObj) {
            const newPCF: PCF = {
              id: `pcf_${generateUUID()}`,
              name: row.pcfName,
              code: row.pcfCode,
              churchId: churchObj.id,
              status: 'active',
              createdAt: startedAt,
            };
            if (navigator.onLine) await setDoc(doc(db, 'pcfs', newPCF.id), newPCF);
            pcfMap.set(pKey, newPCF);
            createdCount++;
          } else if (mode === 'create_and_update' && pcfObj.name !== row.pcfName) {
            pcfObj.name = row.pcfName;
            if (navigator.onLine) await updateDoc(doc(db, 'pcfs', pcfObj.id), { name: row.pcfName });
            updatedCount++;
          } else {
            skippedCount++;
          }
        }
      }
    }

    if (onProgress && total > 0) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  const completedAt = new Date().toISOString();

  const historyRecord: ImportHistoryRecord = {
    id: importId,
    type: 'organization',
    fileName,
    actorId,
    actorName: actorName || undefined,
    totalRows: totalRowsCount,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount,
    status: 'completed',
    timestamp: completedAt,
  };

  if (navigator.onLine) {
    await setDoc(doc(db, 'importHistory', importId), historyRecord);
  }

  await writeAdminAuditLog(
    'organization_bulk_imported',
    actorId,
    importId,
    `Bulk imported ${createdCount} new items, ${updatedCount} updated, ${skippedCount} skipped from file ${fileName}.`
  );

  return historyRecord;
}

/** SuperAdmin function: Execute Bulk Soul Winner Import */
export async function executeSoulWinnerImport(
  target: ImportValidationResult | CSVSoulWinnerRow[],
  mode: ImportMode,
  actorId: string,
  arg4: string,
  arg5?: string | ((pct: number) => void),
  arg6?: (pct: number) => void
): Promise<ImportHistoryRecord> {
  const validatedRows: CSVSoulWinnerRow[] = Array.isArray(target)
    ? target
    : target.validatedSoulWinnerRows || [];
  const totalRowsCount = Array.isArray(target) ? target.length : target.totalRows;

  let actorName = '';
  let fileName = '';
  let onProgress: ((pct: number) => void) | undefined;

  if (typeof arg5 === 'function') {
    fileName = arg4;
    onProgress = arg5;
  } else if (typeof arg5 === 'string') {
    actorName = arg4;
    fileName = arg5;
    onProgress = arg6;
  } else {
    fileName = arg4;
  }

  const importId = generateUUID();
  const startedAt = new Date().toISOString();

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errorCount = 0;

  const [pList, uList] = await Promise.all([getPCFs(), getAllUsers()]);
  const pcfCodeMap = new Map<string, PCF>();
  pList.forEach((p) => pcfCodeMap.set(p.code.toUpperCase(), p));

  const userEmailMap = new Map<string, UserProfile>();
  uList.forEach((u) => userEmailMap.set(u.email.toLowerCase(), u));

  const total = validatedRows.length;

  for (let i = 0; i < total; i++) {
    const row = validatedRows[i];
    const pcf = pcfCodeMap.get(row.pcfCode.toUpperCase());

    if (pcf) {
      const { church, group, zone } = await resolvePCFHierarchy(pcf.id);
      const emailLower = row.email.toLowerCase();
      const existingUser = userEmailMap.get(emailLower);

      if (!existingUser) {
        // Safe Account Model: Status starts as pendingAssignment until auth is linked
        const userId = generateUUID();
        const newUser: UserProfile = {
          id: userId,
          name: row.name,
          email: emailLower,
          phone: '',
          role: 'soulWinner',
          status: 'pendingAssignment',
          createdAt: startedAt,
          updatedAt: startedAt,
        };

        const newSwProfile: SoulWinnerProfile = {
          id: userId,
          userId,
          pcfId: pcf.id,
          churchId: church.id,
          groupId: group.id,
          zoneId: zone.id,
          pcfName: pcf.name,
          churchName: church.name,
          groupName: group.name,
          zoneName: zone.name,
          status: 'pendingAssignment',
          createdAt: startedAt,
          updatedAt: startedAt,
        };

        if (navigator.onLine) {
          await setDoc(doc(db, 'users', userId), newUser);
          await setDoc(doc(db, 'soulWinners', userId), newSwProfile);
        }

        userEmailMap.set(emailLower, newUser);
        createdCount++;
      } else if (mode === 'create_and_update') {
        const swRef = doc(db, 'soulWinners', existingUser.id);
        const updateData = {
          pcfId: pcf.id,
          churchId: church.id,
          groupId: group.id,
          zoneId: zone.id,
          pcfName: pcf.name,
          churchName: church.name,
          groupName: group.name,
          zoneName: zone.name,
          updatedAt: startedAt,
        };

        if (navigator.onLine) {
          await updateDoc(swRef, updateData);
        }
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    if (onProgress && total > 0) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  const completedAt = new Date().toISOString();

  const historyRecord: ImportHistoryRecord = {
    id: importId,
    type: 'soul_winner',
    fileName,
    actorId,
    actorName: actorName || undefined,
    totalRows: totalRowsCount,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount,
    status: 'completed',
    timestamp: completedAt,
  };

  if (navigator.onLine) {
    await setDoc(doc(db, 'importHistory', importId), historyRecord);
  }

  await writeAdminAuditLog(
    'soul_winner_bulk_imported',
    actorId,
    importId,
    `Bulk imported ${createdCount} Soul Winners, ${updatedCount} updated, ${skippedCount} skipped from file ${fileName}.`
  );

  return historyRecord;
}

/** Fetch Import History logs for SuperAdmin inspection */
export async function getImportHistory(): Promise<ImportHistoryRecord[]> {
  try {
    const q = query(collection(db, 'importHistory'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ImportHistoryRecord);
  } catch (err) {
    console.warn('Error fetching import history:', err);
    return [];
  }
}
