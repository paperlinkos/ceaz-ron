import { DEFAULT_CHURCHES, DEFAULT_GROUPS } from './organizationService';
import { generateCSV, downloadCSVFile } from '../utils/csv';
import type { Church, Group } from '../types/organization';

export interface TemplateOptions {
  level: 'church' | 'group' | 'zone';
  churchId?: string;
  churchName?: string;
  churchCode?: string;
  groupId?: string;
  groupName?: string;
  groupCode?: string;
  zoneName?: string;
}

export interface DetectedOrgScope {
  matchedLevel: 'church' | 'group' | 'zone' | 'unknown';
  confidence: 'high' | 'medium' | 'none';
  matchedSource: 'filename' | 'header_metadata' | 'content_column' | 'none';
  matchedChurch?: Church;
  matchedGroup?: Group;
  detectionSummary: string;
}

/** Sanitize a name for safe file names */
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generates and triggers a customized CSV template download tailored
 * specifically for the requested Church, Group, or Zone.
 */
export function downloadCustomizedSoulTemplate(options: TemplateOptions): void {
  const { level, churchId, groupId } = options;

  let church = options.churchId ? DEFAULT_CHURCHES.find((c) => c.id === churchId) : undefined;
  if (!church && options.churchCode) {
    church = DEFAULT_CHURCHES.find((c) => c.code.toLowerCase() === options.churchCode?.toLowerCase());
  }

  let group = options.groupId ? DEFAULT_GROUPS.find((g) => g.id === groupId) : undefined;
  if (!group && church?.groupId) {
    group = DEFAULT_GROUPS.find((g) => g.id === church.groupId);
  }
  if (!group && options.groupCode) {
    group = DEFAULT_GROUPS.find((g) => g.code.toLowerCase() === options.groupCode?.toLowerCase());
  }

  const churchName = church?.name || options.churchName || 'CE Kuje';
  const churchCode = church?.code || options.churchCode || 'CH-KUJ1';
  const groupName = group?.name || options.groupName || (church ? 'Parent Group' : 'Karmo Group');
  const groupCode = group?.code || options.groupCode || 'GRP-KAR';
  const zoneName = options.zoneName || 'Christ Embassy Abuja Zone 1';

  let filename = '';
  let metadataHeader = '';
  let headers: string[] = [];
  let sampleRows: string[][] = [];

  if (level === 'church') {
    const cleanChurch = sanitizeFileName(churchName);
    const cleanCode = sanitizeFileName(churchCode);
    filename = `${cleanChurch}_${cleanCode}_Soul_Import_Template.csv`;

    metadataHeader = `# SCOPE: CHURCH | CHURCH: ${churchName} (${churchCode}) | GROUP: ${groupName} | ZONE: ${zoneName}\n`;
    headers = ['Name', 'Phone Number', 'Born Again', 'Filled with the Spirit', 'Location', 'Notes'];
    sampleRows = [
      ['Brother Emmanuel David', '08031234567', 'Yes', 'Yes', 'Kuje Central Market Outreach', 'New convert eager for foundation school'],
      ['Sister Grace Okon', '08029876543', 'Yes', 'No', 'Kuje Community Youth Center', 'Received Rhapsody of Realities, requested follow-up call'],
      ['Brother Samuel Adebayo', '08145556677', 'Yes', 'Yes', 'Federal Housing Estate Outreach', 'Gave life to Christ during morning evangelism'],
      ['Sister Maryam Danjuma', '09012348899', 'Yes', 'Yes', 'Main Town Bus Stop', 'Filled with the Holy Ghost on the spot'],
    ];
  } else if (level === 'group') {
    const cleanGroup = sanitizeFileName(groupName);
    const cleanGrpCode = sanitizeFileName(groupCode);
    filename = `${cleanGroup}_${cleanGrpCode}_Soul_Import_Template.csv`;

    metadataHeader = `# SCOPE: GROUP | GROUP: ${groupName} (${groupCode}) | ZONE: ${zoneName}\n`;
    headers = ['Church Name', 'Church Code', 'Name', 'Phone Number', 'Born Again', 'Filled with the Spirit', 'Location', 'Notes'];

    // Find actual member churches for this group to generate realistic sample rows
    const memberChurches = group ? DEFAULT_CHURCHES.filter((c) => c.groupId === group.id) : [];
    const sampleCh1 = memberChurches[0]?.name || 'CE Karmo 1';
    const sampleCode1 = memberChurches[0]?.code || 'CH-KAR1';
    const sampleCh2 = memberChurches[1]?.name || memberChurches[0]?.name || 'CE Karmo 2';
    const sampleCode2 = memberChurches[1]?.code || memberChurches[0]?.code || 'CH-KAR2';

    sampleRows = [
      [sampleCh1, sampleCode1, 'Brother David Emmanuel', '08031234567', 'Yes', 'Yes', 'Group Mega Crusade', 'Baptized in the Holy Ghost'],
      [sampleCh1, sampleCode1, 'Sister Blessing Udoh', '08029876543', 'Yes', 'Yes', 'Market Square Outreach', 'Received Healing and Salvation'],
      [sampleCh2, sampleCode2, 'Brother Michael Eze', '08145556677', 'Yes', 'No', 'Community Center', 'Enrolled in Believers LoveWorld class'],
      [sampleCh2, sampleCode2, 'Sister Sarah John', '09012348899', 'Yes', 'Yes', 'Campus Hall ReachOut', 'Led to Christ by Cell Leader'],
    ];
  } else {
    filename = `Abuja_Zone_1_Master_Zonal_Soul_Template.csv`;
    metadataHeader = `# SCOPE: ZONAL | ZONE: ${zoneName} | CAMPAIGN: CEAZ1 REACHOUT NIGERIA\n`;
    headers = ['Group Name', 'Church Name', 'Church Code', 'Name', 'Phone Number', 'Born Again', 'Filled with the Spirit', 'Location', 'Notes'];
    sampleRows = [
      ['Karmo Group', 'CE Karmo 1', 'CH-KAR1', 'Brother Emmanuel David', '08031234567', 'Yes', 'Yes', 'Karmo Town Outreach', 'Gave life to Christ'],
      ['Gwarinpa Group', 'CE Gwarinpa 1', 'CH-GWARINPA1', 'Sister Grace Okon', '08029876543', 'Yes', 'Yes', 'Gwarinpa 3rd Avenue', 'Received Holy Spirit'],
      ['Wuye Sub-Group 1', 'CE KBS', 'CH-KBS', 'Brother Samuel Adebayo', '08145556677', 'Yes', 'No', 'Wuye District Campaign', 'Follow-up visit scheduled'],
      ['Kuje Group', 'CE Kuje', 'CH-KUJ1', 'Sister Fatima Bello', '09012348899', 'Yes', 'Yes', 'Kuje Market Crusade', 'New cell member'],
    ];
  }

  const csvBody = generateCSV(headers, sampleRows);
  const fullContent = '\uFEFF' + metadataHeader + csvBody;

  downloadCSVFile(filename, fullContent);
}

/**
 * Normalizes text for fuzzy token matching
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.csv$|\.xlsx$|\.xls$/i, '')
    .replace(/[_\-\.\,\(\)\[\]\/\\\#\:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart automatic detection engine:
 * Inspects filename and CSV content to automatically detect Church, Group, or Zonal scope!
 */
export function detectOrganizationFromFilenameAndContent(
  filename: string,
  csvContent: string = ''
): DetectedOrgScope {
  const normFilename = normalizeForMatching(filename);
  const upperFilename = filename.toUpperCase();

  // 1. Check for metadata header line (e.g. # SCOPE: CHURCH | CHURCH: CE Kuje (CH-KUJ1) ...)
  const lines = csvContent.split(/\r?\n/).slice(0, 5);
  for (const line of lines) {
    if (line.startsWith('#')) {
      // Check for exact Church Code in metadata
      for (const ch of DEFAULT_CHURCHES) {
        if (line.includes(`(${ch.code})`) || line.includes(ch.code)) {
          const parentGroup = DEFAULT_GROUPS.find((g) => g.id === ch.groupId);
          return {
            matchedLevel: 'church',
            confidence: 'high',
            matchedSource: 'header_metadata',
            matchedChurch: ch,
            matchedGroup: parentGroup,
            detectionSummary: `Auto-detected from template header: ${ch.name} (${ch.code}) under ${parentGroup?.name || 'Group'}.`,
          };
        }
      }

      // Check for exact Group Code in metadata
      for (const grp of DEFAULT_GROUPS) {
        if (line.includes(`(${grp.code})`) || line.includes(grp.code)) {
          return {
            matchedLevel: 'group',
            confidence: 'high',
            matchedSource: 'header_metadata',
            matchedGroup: grp,
            detectionSummary: `Auto-detected from template header: ${grp.name} (${grp.code}).`,
          };
        }
      }
    }
  }

  // 2. Exact Church Code in Filename (e.g. "CH-KUJ1", "CH-KBS", "CH_GWARINPA1", "CH-EXP")
  for (const ch of DEFAULT_CHURCHES) {
    const rawCode = ch.code.toUpperCase();
    const cleanCode = rawCode.replace(/[^A-Z0-9]/g, '');

    if (
      upperFilename.includes(rawCode) ||
      upperFilename.includes(rawCode.replace('-', '_')) ||
      (cleanCode.length >= 4 && upperFilename.includes(cleanCode))
    ) {
      const parentGroup = DEFAULT_GROUPS.find((g) => g.id === ch.groupId);
      return {
        matchedLevel: 'church',
        confidence: 'high',
        matchedSource: 'filename',
        matchedChurch: ch,
        matchedGroup: parentGroup,
        detectionSummary: `Recognized church code "${ch.code}" in filename: Attributed to ${ch.name} (${parentGroup?.name || 'Group'}).`,
      };
    }
  }

  // 3. Exact Church Name in Filename (e.g. "CE Kuje", "CE Karmo 1", "CE Airport Road 4", "CE Damagaza", "CE Bwari Main")
  // Sort churches by name length descending so longer specific names match first (e.g. "CE Karmo 2" before "CE Karmo")
  const sortedChurches = [...DEFAULT_CHURCHES].sort((a, b) => b.name.length - a.name.length);
  for (const ch of sortedChurches) {
    const normChurchName = normalizeForMatching(ch.name);
    const shortNameWithoutCE = normChurchName.replace(/^ce\s+/, '').trim();

    if (
      normFilename.includes(normChurchName) ||
      (shortNameWithoutCE.length >= 4 && normFilename.includes(shortNameWithoutCE))
    ) {
      const parentGroup = DEFAULT_GROUPS.find((g) => g.id === ch.groupId);
      return {
        matchedLevel: 'church',
        confidence: 'high',
        matchedSource: 'filename',
        matchedChurch: ch,
        matchedGroup: parentGroup,
        detectionSummary: `Recognized church "${ch.name}" in filename: Attributed to ${ch.name} (${parentGroup?.name || 'Group'}).`,
      };
    }
  }

  // 4. Exact Group Code in Filename (e.g. "GRP-KAR", "GRP-KUJ", "GRP-GWA")
  for (const grp of DEFAULT_GROUPS) {
    const rawCode = grp.code.toUpperCase();
    if (upperFilename.includes(rawCode) || upperFilename.includes(rawCode.replace('-', '_'))) {
      return {
        matchedLevel: 'group',
        confidence: 'high',
        matchedSource: 'filename',
        matchedGroup: grp,
        detectionSummary: `Recognized group code "${grp.code}" in filename: Attributed to ${grp.name}.`,
      };
    }
  }

  // 5. Exact Group Name in Filename (e.g. "Karmo Group", "Kuje Group", "Gwarinpa Group", "Lokogoma Group", "Bwari Group")
  const sortedGroups = [...DEFAULT_GROUPS].sort((a, b) => b.name.length - a.name.length);
  for (const grp of sortedGroups) {
    const normGroupName = normalizeForMatching(grp.name);
    const shortGroupName = normGroupName.replace(/\s+group$/, '').replace(/\s+sub\s+group.*$/, '').trim();

    if (
      normFilename.includes(normGroupName) ||
      (shortGroupName.length >= 4 && normFilename.includes(shortGroupName))
    ) {
      return {
        matchedLevel: 'group',
        confidence: 'high',
        matchedSource: 'filename',
        matchedGroup: grp,
        detectionSummary: `Recognized group "${grp.name}" in filename: Attributed to ${grp.name}.`,
      };
    }
  }

  // 6. Check if Zonal Template
  if (
    normFilename.includes('zonal') ||
    normFilename.includes('abuja zone 1') ||
    normFilename.includes('ceaz1 master') ||
    upperFilename.includes('CEAZ1_MASTER')
  ) {
    return {
      matchedLevel: 'zone',
      confidence: 'high',
      matchedSource: 'filename',
      detectionSummary: 'Recognized Master Zonal template in filename: Multi-church batch import.',
    };
  }

  return {
    matchedLevel: 'unknown',
    confidence: 'none',
    matchedSource: 'none',
    detectionSummary: 'No specific church or group title recognized in filename. Using selected default dropdown scope.',
  };
}
