import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  Church,
  User,
  Phone,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSoulRecords } from '../../hooks/useSoulRecords';
import { DEFAULT_GROUPS, DEFAULT_CHURCHES, getGroups, getChurches } from '../../services/organizationService';
import { saveLocalRecord } from '../../services/indexedDbService';
import { syncPendingRecords, notifyRecordChanges } from '../../services/syncService';
import { parseCSV } from '../../utils/csv';
import { generateUUID } from '../../utils/uuid';
import { isValidPhoneNumber, isNonEmptyText } from '../../utils/validation';
import {
  downloadCustomizedSoulTemplate,
  detectOrganizationFromFilenameAndContent,
  type DetectedOrgScope,
} from '../../services/templateRecognitionService';
import type { SoulWinningRecord } from '../../types/record';
import type { Group, Church as ChurchType } from '../../types/organization';

interface ParsedSoulRow {
  rowIndex: number;
  groupName?: string;
  groupId?: string;
  churchName?: string;
  churchId?: string;
  name: string;
  phone: string;
  location: string;
  isBornAgain?: boolean;
  isFilledWithHolySpirit?: boolean;
  notes?: string;
  isValid: boolean;
  error?: string;
}

export const LeaderSoulEntryView: React.FC = () => {
  const { userProfile, soulWinnerProfile, role } = useAuth();
  const { records } = useSoulRecords();

  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'history'>('single');

  // Single Entry Form State
  const [selectedGroupId, setSelectedGroupId] = useState<string>(soulWinnerProfile?.groupId || 'grp-gwarinpa');
  const [selectedChurchId, setSelectedChurchId] = useState<string>(soulWinnerProfile?.churchId || 'ch-ce-gwarinpa-1');
  const [singleName, setSingleName] = useState<string>('');
  const [singlePhone, setSinglePhone] = useState<string>('');
  const [singleIsBornAgain, setSingleIsBornAgain] = useState<boolean>(true);
  const [singleIsFilledWithHolySpirit, setSingleIsFilledWithHolySpirit] = useState<boolean>(true);
  const [singleNotes, setSingleNotes] = useState<string>('');
  const [singleSuccess, setSingleSuccess] = useState<string | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [isSingleSubmitting, setIsSingleSubmitting] = useState<boolean>(false);

  // Bulk Upload State
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>(soulWinnerProfile?.groupId || 'grp-gwarinpa');
  const [bulkTargetChurchId, setBulkTargetChurchId] = useState<string>(soulWinnerProfile?.churchId || 'ch-ce-gwarinpa-1');
  const [overrideChurch, setOverrideChurch] = useState<boolean>(false);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedSoulRow[]>([]);
  const [isCommitingBulk, setIsCommitingBulk] = useState<boolean>(false);
  const [bulkCommitSuccess, setBulkCommitSuccess] = useState<string | null>(null);
  const [bulkCommitError, setBulkCommitError] = useState<string | null>(null);

  // Template customizer state
  const [templateSelectedChurchId, setTemplateSelectedChurchId] = useState<string>(
    soulWinnerProfile?.churchId || 'ch-ce-kuje'
  );
  const [templateSelectedGroupId, setTemplateSelectedGroupId] = useState<string>(
    soulWinnerProfile?.groupId || 'grp-kuje-group'
  );

  // Smart Auto-detection state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [detectedOrgScope, setDetectedOrgScope] = useState<DetectedOrgScope | null>(null);

  // Available groups and churches from live database / cache
  const [availableGroups, setAvailableGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [availableChurches, setAvailableChurches] = useState<ChurchType[]>(DEFAULT_CHURCHES);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getGroups(), getChurches()]).then(([gList, cList]) => {
      if (isMounted) {
        if (gList && gList.length > 0) setAvailableGroups(gList);
        if (cList && cList.length > 0) setAvailableChurches(cList);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const getChurchesForGroup = (grpId: string): ChurchType[] => {
    return availableChurches.filter((c) => c.groupId === grpId);
  };

  // Sync initial selections if profile updates
  useEffect(() => {
    if (soulWinnerProfile?.groupId) setSelectedGroupId(soulWinnerProfile.groupId);
    if (soulWinnerProfile?.churchId) setSelectedChurchId(soulWinnerProfile.churchId);
  }, [soulWinnerProfile]);

  // When selectedGroupId changes, update selectedChurchId to first church in that group
  const handleGroupChange = (grpId: string) => {
    setSelectedGroupId(grpId);
    const churchesInGrp = getChurchesForGroup(grpId);
    if (churchesInGrp.length > 0) {
      setSelectedChurchId(churchesInGrp[0].id);
    } else {
      setSelectedChurchId('');
    }
  };

  const handleBulkGroupChange = (grpId: string) => {
    setBulkTargetGroupId(grpId);
    const churchesInGrp = getChurchesForGroup(grpId);
    if (churchesInGrp.length > 0) {
      setBulkTargetChurchId(churchesInGrp[0].id);
    } else {
      setBulkTargetChurchId('');
    }
  };

  // Handle Single Entry Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleSuccess(null);
    setSingleError(null);

    if (!isNonEmptyText(singleName)) {
      setSingleError("Please enter the soul's full name.");
      return;
    }
    if (!isNonEmptyText(singlePhone) || !isValidPhoneNumber(singlePhone)) {
      setSingleError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    if (!selectedChurchId) {
      setSingleError('Please select a target Church.');
      return;
    }

    setIsSingleSubmitting(true);
    try {
      const churchObj = availableChurches.find((c) => c.id === selectedChurchId);
      const groupObj = availableGroups.find((g) => g.id === (churchObj?.groupId || selectedGroupId));
      const loc = churchObj?.name || 'Abuja';

      const nowIso = new Date().toISOString();
      const newRecord: SoulWinningRecord = {
        id: generateUUID(),
        name: singleName.trim(),
        phone: singlePhone.trim(),
        location: loc,
        isBornAgain: singleIsBornAgain,
        isFilledWithHolySpirit: singleIsFilledWithHolySpirit,
        notes: singleNotes.trim() || undefined,
        createdAt: nowIso,
        clientCreatedAt: nowIso,
        syncStatus: 'pending',
        soulWinnerId: userProfile?.id || 'leader',
        churchId: churchObj?.id || selectedChurchId,
        churchName: churchObj?.name || 'Selected Church',
        groupId: groupObj?.id || selectedGroupId,
        groupName: groupObj?.name || 'Selected Group',
        zoneId: 'zone-abuja-1',
        zoneName: 'Abuja Zone 1',
        eventId: 'ron-2026-oct1',
      };

      await saveLocalRecord(newRecord);
      await notifyRecordChanges();
      syncPendingRecords();

      setSingleSuccess(`Successfully recorded ${singleName} for ${churchObj?.name || 'Church'}!`);
      setSingleName('');
      setSinglePhone('');
      setSingleIsBornAgain(true);
      setSingleIsFilledWithHolySpirit(true);
      setSingleNotes('');
    } catch (err) {
      console.error('Single submission error:', err);
      setSingleError('Failed to record soul. Please try again.');
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  // Helper: Download Template CSV with customized names in titles & columns
  const handleDownloadTemplate = (
    templateType: 'church' | 'group' | 'zone',
    specificChurchId?: string,
    specificGroupId?: string
  ) => {
    downloadCustomizedSoulTemplate({
      level: templateType,
      churchId:
        specificChurchId ||
        templateSelectedChurchId ||
        bulkTargetChurchId ||
        soulWinnerProfile?.churchId,
      groupId:
        specificGroupId ||
        templateSelectedGroupId ||
        bulkTargetGroupId ||
        soulWinnerProfile?.groupId,
    });
  };

  // Parse CSV File or Raw Text with smart auto-detection
  const handleParseCsvContent = (text: string, scope?: DetectedOrgScope | null) => {
    setCsvRawText(text);
    setBulkCommitSuccess(null);
    setBulkCommitError(null);

    const rows = parseCSV(text);
    if (rows.length < 2) {
      setParsedRows([]);
      return;
    }

    const header = rows[0].map((h) => h.toLowerCase());
    const nameIdx = header.findIndex((h) => h.includes('name') && !h.includes('church') && !h.includes('group'));
    const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('tel'));
    const bornIdx = header.findIndex((h) => h.includes('born'));
    const filledIdx = header.findIndex((h) => h.includes('filled') || h.includes('spirit'));
    const locIdx = header.findIndex((h) => h.includes('location') || h.includes('address'));
    const notesIdx = header.findIndex((h) => h.includes('note') || h.includes('comment'));
    const churchIdx = header.findIndex((h) => h.includes('church'));
    const groupIdx = header.findIndex((h) => h.includes('group'));

    const parsedList: ParsedSoulRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || row.every((cell) => !cell.trim())) continue;
      if (row[0]?.startsWith('#')) continue; // Skip metadata comment lines

      const nameVal = nameIdx >= 0 ? row[nameIdx] || '' : row[0] || '';
      const phoneVal = phoneIdx >= 0 ? row[phoneIdx] || '' : row[1] || '';
      const bornVal = bornIdx >= 0 ? (row[bornIdx] || 'yes').toLowerCase() : 'yes';
      const filledVal = filledIdx >= 0 ? (row[filledIdx] || 'yes').toLowerCase() : 'yes';
      const locVal = locIdx >= 0 && row[locIdx]?.trim() ? row[locIdx].trim() : 'Church Outreach';
      const notesVal = notesIdx >= 0 ? row[notesIdx] || '' : '';
      const churchNameVal = churchIdx >= 0 ? row[churchIdx] || '' : '';
      const groupNameVal = groupIdx >= 0 ? row[groupIdx] || '' : '';

      const isBornAgain = ['yes', 'y', 'true', '1'].includes(bornVal.trim());
      const isFilledWithHolySpirit = ['yes', 'y', 'true', '1'].includes(filledVal.trim());

      let isValid = true;
      let errorMsg = '';

      if (!isNonEmptyText(nameVal)) {
        isValid = false;
        errorMsg = 'Missing name';
      } else if (!isNonEmptyText(phoneVal)) {
        isValid = false;
        errorMsg = 'Missing phone number';
      } else if (!isValidPhoneNumber(phoneVal)) {
        isValid = false;
        errorMsg = 'Invalid phone number format';
      }

      // Match Church if provided in CSV, or fallback to smart auto-detected church
      let matchedChurchId: string | undefined = undefined;
      let matchedChurchName: string | undefined = undefined;
      let matchedGroupId: string | undefined = undefined;
      let matchedGroupName: string | undefined = undefined;

      if (churchNameVal.trim()) {
        const normVal = churchNameVal.toLowerCase().trim();
        const foundCh = availableChurches.find(
          (c) =>
            c.name.toLowerCase().trim() === normVal ||
            c.code.toLowerCase() === normVal ||
            c.name.toLowerCase().includes(normVal) ||
            normVal.includes(c.name.toLowerCase().trim())
        );
        if (foundCh) {
          matchedChurchId = foundCh.id;
          matchedChurchName = foundCh.name;
          matchedGroupId = foundCh.groupId;
          const foundGrp = availableGroups.find((g) => g.id === foundCh.groupId);
          matchedGroupName = foundGrp?.name;
        } else if (!overrideChurch) {
          if (bulkTargetChurchId || scope?.matchedChurch) {
            const fallbackCh = availableChurches.find((c) => c.id === (scope?.matchedChurch?.id || bulkTargetChurchId));
            if (fallbackCh) {
              matchedChurchId = fallbackCh.id;
              matchedChurchName = fallbackCh.name;
              matchedGroupId = fallbackCh.groupId;
              const foundGrp = availableGroups.find((g) => g.id === fallbackCh.groupId);
              matchedGroupName = foundGrp?.name;
            }
          } else {
            isValid = false;
            errorMsg = `Church "${churchNameVal}" not found`;
          }
        }
      } else if (scope?.matchedChurch) {
        matchedChurchId = scope.matchedChurch.id;
        matchedChurchName = scope.matchedChurch.name;
        matchedGroupId = scope.matchedChurch.groupId;
        matchedGroupName = scope.matchedGroup?.name;
      } else if (scope?.matchedGroup) {
        matchedGroupId = scope.matchedGroup.id;
        matchedGroupName = scope.matchedGroup.name;
      }

      parsedList.push({
        rowIndex: i + 1,
        name: nameVal.trim(),
        phone: phoneVal.trim(),
        location: locVal.trim(),
        isBornAgain,
        isFilledWithHolySpirit,
        notes: notesVal.trim() || undefined,
        churchName: matchedChurchName || churchNameVal,
        churchId: matchedChurchId,
        groupName: matchedGroupName || groupNameVal,
        groupId: matchedGroupId,
        isValid,
        error: errorMsg || undefined,
      });
    }

    setParsedRows(parsedList);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        // Run smart detector on filename & content
        const scope = detectOrganizationFromFilenameAndContent(file.name, text, availableChurches, availableGroups);
        setDetectedOrgScope(scope);

        if (scope.matchedChurch) {
          setBulkTargetChurchId(scope.matchedChurch.id);
          setBulkTargetGroupId(scope.matchedChurch.groupId);
        } else if (scope.matchedGroup) {
          setBulkTargetGroupId(scope.matchedGroup.id);
          const groupChurches = availableChurches.filter((c) => c.groupId === scope.matchedGroup?.id);
          if (groupChurches.length > 0) {
            setBulkTargetChurchId(groupChurches[0].id);
          }
        }

        handleParseCsvContent(text, scope);
      }
    };
    reader.readAsText(file);
  };

  // Commit Valid Bulk Records to Database
  const handleCommitBulk = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsCommitingBulk(true);
    setBulkCommitSuccess(null);
    setBulkCommitError(null);

    try {
      const fallbackChurch = availableChurches.find((c) => c.id === bulkTargetChurchId);
      const fallbackGroup = availableGroups.find((g) => g.id === (fallbackChurch?.groupId || bulkTargetGroupId));

      const nowIso = new Date().toISOString();
      let addedCount = 0;

      for (const row of validRows) {
        const targetChId = row.churchId || fallbackChurch?.id || bulkTargetChurchId;
        const targetChName = row.churchName || fallbackChurch?.name || 'Selected Church';
        const targetGrpId = row.groupId || fallbackGroup?.id || bulkTargetGroupId;
        const targetGrpName = row.groupName || fallbackGroup?.name || 'Selected Group';

        const record: SoulWinningRecord = {
          id: generateUUID(),
          name: row.name,
          phone: row.phone,
          location: row.location,
          isBornAgain: row.isBornAgain ?? true,
          isFilledWithHolySpirit: row.isFilledWithHolySpirit ?? true,
          notes: row.notes,
          createdAt: nowIso,
          clientCreatedAt: nowIso,
          syncStatus: 'pending',
          soulWinnerId: userProfile?.id || 'leader',
          churchId: targetChId,
          churchName: targetChName,
          groupId: targetGrpId,
          groupName: targetGrpName,
          zoneId: 'zone-abuja-1',
          zoneName: 'Abuja Zone 1',
          eventId: 'ron-2026-oct1',
        };

        await saveLocalRecord(record);
        addedCount++;
      }

      await notifyRecordChanges();
      syncPendingRecords();

      setBulkCommitSuccess(`Successfully imported and recorded ${addedCount} souls across targeted churches!`);
      setParsedRows([]);
      setCsvRawText('');
    } catch (err) {
      console.error('Bulk commit error:', err);
      setBulkCommitError('Failed to commit bulk import. Please check file formatting.');
    } finally {
      setIsCommitingBulk(false);
    }
  };

  const isChurchAdmin = role === 'churchManager';
  const isGroupAdmin = role === 'groupManager';
  const isZonalAdmin = role === 'zoneManager' || role === 'superAdmin';

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;
  const invalidRowsCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="record-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* LEADER HEADER / CONTEXT BANNER */}
      <div
        className="account-card"
        style={{
          background: 'linear-gradient(135deg, #071710 0%, #0d2a1d 100%)',
          color: '#ffffff',
          border: '1px solid rgba(0, 135, 81, 0.4)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Building2 size={20} color="#FFD700" />
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#ffffff' }}>
                LEADER SOUL ENTRY & BULK UPLOAD HUB
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              {isChurchAdmin
                ? `Recording & bulk importing souls for ${soulWinnerProfile?.churchName || 'your assigned Church'}.`
                : isGroupAdmin
                ? `Managing & bulk uploading souls across Churches in ${soulWinnerProfile?.groupName || 'your Group'}.`
                : 'Zonal Master Entry: Single & Bulk Soul Uploads for all Groups & Churches in Abuja Zone 1.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                background: 'rgba(0, 135, 81, 0.25)',
                border: '1px solid #008751',
                color: '#4ade80',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: '600',
              }}
            >
              {isChurchAdmin ? 'CHURCH LEADER' : isGroupAdmin ? 'GROUP LEADER' : 'ZONAL ADMIN'}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAV BAR */}
      <div className="record-subnav" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`subtab-btn ${activeTab === 'single' ? 'subtab-active' : ''}`}
        >
          <UserPlus size={16} />
          <span>SINGLE SOUL ENTRY</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`subtab-btn ${activeTab === 'bulk' ? 'subtab-active' : ''}`}
        >
          <FileSpreadsheet size={16} />
          <span>BULK CSV / EXCEL UPLOAD</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`subtab-btn ${activeTab === 'history' ? 'subtab-active' : ''}`}
        >
          <FileText size={16} />
          <span>SUBMISSIONS HISTORY ({records.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: SINGLE SOUL ENTRY ================= */}
      {activeTab === 'single' && (
        <div className="form-card rapid-record-card">
          <div className="record-form-top-bar" style={{ marginBottom: '20px' }}>
            <h3 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} className="text-green-accent" />
              <span>RECORD SINGLE SOUL</span>
            </h3>
          </div>

          {singleSuccess && (
            <div className="banner banner-success" role="status" style={{ marginBottom: '16px' }}>
              <CheckCircle2 size={18} />
              <div>
                <strong>SUCCESS</strong>
                <p className="banner-subtext">{singleSuccess}</p>
              </div>
            </div>
          )}

          {singleError && (
            <div className="banner banner-error" role="status" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <div>
                <strong>ERROR</strong>
                <p className="banner-subtext">{singleError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSingleSubmit} className="record-form">
            {/* GROUP & CHURCH TARGET SELECTORS (For Group & Zonal Admins) */}
            {(isGroupAdmin || isZonalAdmin) && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#065f46', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
                  🎯 Target Organizational Assignment
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: isZonalAdmin ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  {isZonalAdmin && (
                    <div className="form-group">
                      <label className="form-label">TARGET GROUP</label>
                      <div className="input-wrapper">
                        <Building2 size={18} className="input-icon" />
                        <select
                          value={selectedGroupId}
                          onChange={(e) => handleGroupChange(e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: '40px', appearance: 'auto', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                        >
                          {availableGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">TARGET CHURCH</label>
                    <div className="input-wrapper">
                      <Church size={18} className="input-icon" />
                      <select
                        value={selectedChurchId}
                        onChange={(e) => setSelectedChurchId(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '40px', appearance: 'auto', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                      >
                        {getChurchesForGroup(selectedGroupId).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SOUL DETAILS */}
            <div className="form-group">
              <label htmlFor="single-name" className="form-label">
                SOUL FULL NAME *
              </label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="single-name"
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="e.g. Brother Emmanuel Okafor"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="single-phone" className="form-label">
                PHONE NUMBER *
              </label>
              <div className="input-wrapper">
                <Phone size={18} className="input-icon" />
                <input
                  id="single-phone"
                  type="tel"
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="form-input"
                />
              </div>
            </div>

            {/* SPIRITUAL STATUS */}
            <div className="form-group">
              <label className="form-label">SPIRITUAL MILESTONES</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: singleIsBornAgain ? 'rgba(0, 135, 81, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: singleIsBornAgain ? '1.5px solid #008751' : '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                    color: singleIsBornAgain ? '#4ade80' : '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    userSelect: 'none',
                    flex: '1 1 140px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={singleIsBornAgain}
                    onChange={(e) => setSingleIsBornAgain(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#008751', cursor: 'pointer' }}
                  />
                  <span>✨ Born Again</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: singleIsFilledWithHolySpirit ? 'rgba(255, 215, 0, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: singleIsFilledWithHolySpirit ? '1.5px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                    color: singleIsFilledWithHolySpirit ? '#FFD700' : '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    userSelect: 'none',
                    flex: '1 1 140px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={singleIsFilledWithHolySpirit}
                    onChange={(e) => setSingleIsFilledWithHolySpirit(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#FFD700', cursor: 'pointer' }}
                  />
                  <span>🔥 Filled with The Spirit</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="single-notes" className="form-label">
                ADDITIONAL NOTES / FOLLOW-UP (OPTIONAL)
              </label>
              <textarea
                id="single-notes"
                value={singleNotes}
                onChange={(e) => setSingleNotes(e.target.value)}
                placeholder="e.g. Invited for Sunday first service, needs baptism class."
                className="form-input"
                rows={2}
                style={{ paddingLeft: '14px', paddingTop: '10px' }}
              />
            </div>

            <button type="submit" disabled={isSingleSubmitting} className="submit-button" style={{ marginTop: '12px' }}>
              <UserPlus size={18} />
              <span>{isSingleSubmitting ? 'RECORDING SOUL...' : 'RECORD SOUL NOW'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 2: BULK CSV / EXCEL UPLOAD ================= */}
      {activeTab === 'bulk' && (
        <div className="form-card rapid-record-card">
          <div className="record-form-top-bar" style={{ marginBottom: '20px' }}>
            <h3 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} className="text-green-accent" />
              <span>BULK CSV / EXCEL SPREADSHEET UPLOAD</span>
            </h3>
          </div>

          {/* TEMPLATE DOWNLOAD BOX */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.06) 0%, rgba(0, 135, 81, 0.02) 100%)',
              border: '1px solid rgba(0, 135, 81, 0.25)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 800, fontSize: '0.95rem' }}>
                <Download size={18} className="text-green-accent" />
                <span>CUSTOMIZED CSV IMPORT TEMPLATES</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#047857', background: 'rgba(0, 135, 81, 0.12)', border: '1px solid rgba(0, 135, 81, 0.2)', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                ✨ Pre-named with Church & Group Titles
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#334155', margin: '0 0 14px 0', lineHeight: '1.5' }}>
              Download pre-titled CSV templates customized specifically with your Church or Group names in the file title and columns.
              When uploaded, the system will automatically recognize the organization name from the title!
            </p>

            {/* Interactive Template Customizer Selector (Scoped by Role) */}
            <div style={{ display: 'grid', gridTemplateColumns: isZonalAdmin ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '14px', background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.03em' }}>
                  {isChurchAdmin ? 'YOUR CHURCH TEMPLATE:' : isGroupAdmin ? 'SELECT CHURCH IN YOUR GROUP:' : 'SELECT CHURCH FOR TEMPLATE:'}
                </label>
                <select
                  value={templateSelectedChurchId}
                  onChange={(e) => {
                    setTemplateSelectedChurchId(e.target.value);
                    const ch = availableChurches.find((c) => c.id === e.target.value);
                    if (ch) setTemplateSelectedGroupId(ch.groupId);
                  }}
                  disabled={isChurchAdmin}
                  className="form-input"
                  style={{ fontSize: '0.84rem', padding: '8px 12px', height: '40px', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', opacity: isChurchAdmin ? 0.8 : 1 }}
                >
                  {(isGroupAdmin
                    ? availableChurches.filter((c) => c.groupId === (soulWinnerProfile?.groupId || bulkTargetGroupId))
                    : isChurchAdmin
                    ? availableChurches.filter((c) => c.id === (soulWinnerProfile?.churchId || templateSelectedChurchId))
                    : availableChurches
                  ).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {isZonalAdmin && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px', letterSpacing: '0.03em' }}>
                    SELECT GROUP FOR TEMPLATE:
                  </label>
                  <select
                    value={templateSelectedGroupId}
                    onChange={(e) => setTemplateSelectedGroupId(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.84rem', padding: '8px 12px', height: '40px', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  >
                    {availableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Church Template Button (Visible to all roles) */}
              <button
                type="button"
                onClick={() => handleDownloadTemplate('church', templateSelectedChurchId, templateSelectedGroupId)}
                style={{
                  background: '#008751',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  padding: '10px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 135, 81, 0.3)',
                }}
              >
                <Download size={16} />
                <span>
                  Download Church Template (
                  {availableChurches.find((c) => c.id === (isChurchAdmin ? soulWinnerProfile?.churchId : templateSelectedChurchId))?.name || 'Your Church'}
                  )
                </span>
              </button>

              {/* Group Template Button (ONLY for Group Admin, Zonal Admin, Super Admin) */}
              {(isGroupAdmin || isZonalAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('group', templateSelectedChurchId, isGroupAdmin ? soulWinnerProfile?.groupId : templateSelectedGroupId)}
                  className="secondary-button"
                  style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                >
                  <Download size={14} />
                  <span>
                    Download Group Template (
                    {availableGroups.find((g) => g.id === (isGroupAdmin ? soulWinnerProfile?.groupId : templateSelectedGroupId))?.name || 'Your Group'}
                    )
                  </span>
                </button>
              )}

              {/* Master Zonal Template Button (ONLY for Zonal Admin & Super Admin) */}
              {isZonalAdmin && (
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('zone')}
                  className="secondary-button"
                  style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                >
                  <Download size={14} />
                  <span>Download Master Zonal Template</span>
                </button>
              )}
            </div>
          </div>

          {/* SMART AUTO-DETECTION STATUS BANNER */}
          {detectedOrgScope && detectedOrgScope.matchedLevel !== 'unknown' && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)',
                border: '1.5px solid #00d68f',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxShadow: '0 4px 16px rgba(0, 135, 81, 0.12)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#008751',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={20} className="animate-pulse" />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#FFD700', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    🎯 AUTO-DETECTED FROM FILENAME:
                  </span>
                  <code style={{ background: 'rgba(0,0,0,0.4)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                    {uploadedFileName}
                  </code>
                </div>

                <div style={{ fontSize: '0.86rem', color: '#f8fafc', fontWeight: 700, margin: '4px 0' }}>
                  {detectedOrgScope.matchedChurch ? (
                    <span>
                      Attributed to Church:{' '}
                      <strong style={{ color: '#00d68f', textDecoration: 'underline' }}>
                        {detectedOrgScope.matchedChurch.name} ({detectedOrgScope.matchedChurch.code})
                      </strong>{' '}
                      under{' '}
                      <strong style={{ color: '#fbbf24' }}>
                        {detectedOrgScope.matchedGroup?.name || 'Parent Group'}
                      </strong>
                    </span>
                  ) : detectedOrgScope.matchedGroup ? (
                    <span>
                      Attributed to Group:{' '}
                      <strong style={{ color: '#fbbf24' }}>
                        {detectedOrgScope.matchedGroup.name} ({detectedOrgScope.matchedGroup.code})
                      </strong>
                    </span>
                  ) : (
                    <span>Master Zonal Campaign Template Detected</span>
                  )}
                </div>

                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: 1.3 }}>
                  {detectedOrgScope.detectionSummary}
                </p>
              </div>
            </div>
          )}

          {/* BULK TARGET CHURCH / OVERRIDE SELECTOR */}
          {(isGroupAdmin || isZonalAdmin) && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#065f46', margin: 0, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.03em' }}>
                  🎯 Target Church for Upload Batch
                </h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={overrideChurch}
                    onChange={(e) => setOverrideChurch(e.target.checked)}
                  />
                  <span>Force assign all rows in CSV to selected Church</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isZonalAdmin ? '1fr 1fr' : '1fr', gap: '12px' }}>
                {isZonalAdmin && (
                  <div className="form-group">
                    <label className="form-label">TARGET GROUP</label>
                    <select
                      value={bulkTargetGroupId}
                      onChange={(e) => handleBulkGroupChange(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '14px', appearance: 'auto', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                    >
                      {availableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">TARGET CHURCH</label>
                  <select
                    value={bulkTargetChurchId}
                    onChange={(e) => setBulkTargetChurchId(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '14px', appearance: 'auto', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                  >
                    {getChurchesForGroup(bulkTargetGroupId).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD FILE & PASTE INPUT */}
          <div className="form-group">
            <label className="form-label">SELECT CSV FILE TO UPLOAD</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="form-input"
              style={{ padding: '8px 12px', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', cursor: 'pointer' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">OR PASTE CSV DATA DIRECTLY</label>
            <textarea
              value={csvRawText}
              onChange={(e) => handleParseCsvContent(e.target.value)}
              placeholder={`Soul Name,Phone,Location,Notes\nJohn Doe,08012345678,Gwarinpa Estate,First timer\nJane Smith,08087654321,Wuye Market,Outreach convert`}
              className="form-input"
              rows={4}
              style={{ paddingLeft: '14px', paddingTop: '10px', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>

          {/* BULK NOTIFICATIONS */}
          {bulkCommitSuccess && (
            <div className="banner banner-success" role="status" style={{ marginTop: '16px' }}>
              <CheckCircle2 size={18} />
              <div>
                <strong>SUCCESS</strong>
                <p className="banner-subtext">{bulkCommitSuccess}</p>
              </div>
            </div>
          )}

          {bulkCommitError && (
            <div className="banner banner-error" role="status" style={{ marginTop: '16px' }}>
              <AlertCircle size={18} />
              <div>
                <strong>ERROR</strong>
                <p className="banner-subtext">{bulkCommitError}</p>
              </div>
            </div>
          )}

          {/* PREVIEW SUMMARY TABLE */}
          {parsedRows.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0, color: '#ffffff' }}>
                  FILE VALIDATION PREVIEW ({parsedRows.length} ROWS)
                </h4>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ Valid: {validRowsCount}</span>
                  {invalidRowsCount > 0 && (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✗ Errors: {invalidRowsCount}</span>
                  )}
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#008751', color: '#ffffff' }}>
                      <th style={{ padding: '8px 12px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>STATUS</th>
                      <th style={{ padding: '8px 12px' }}>NAME</th>
                      <th style={{ padding: '8px 12px' }}>PHONE</th>
                      <th style={{ padding: '8px 12px' }}>LOCATION</th>
                      <th style={{ padding: '8px 12px' }}>CHURCH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: row.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.rowIndex}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {row.isValid ? (
                            <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ Valid</span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗ {row.error}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 'bold' }}>{row.name}</td>
                        <td style={{ padding: '8px 12px', color: '#334155' }}>{row.phone}</td>
                        <td style={{ padding: '8px 12px', color: '#334155' }}>{row.location}</td>
                        <td style={{ padding: '8px 12px', color: '#059669', fontWeight: 600 }}>
                          {row.churchName || availableChurches.find((c) => c.id === bulkTargetChurchId)?.name || 'Default'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleCommitBulk}
                disabled={validRowsCount === 0 || isCommitingBulk}
                className="submit-button"
                style={{ marginTop: '16px' }}
              >
                <Upload size={18} />
                <span>
                  {isCommitingBulk
                    ? 'COMMITTING BULK IMPORT...'
                    : `COMMIT BULK IMPORT (${validRowsCount} VALID SOULS)`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: SUBMISSIONS HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="account-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="form-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} className="text-green-accent" />
              <span>RECORDED SOULS HISTORY</span>
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#008751', fontWeight: 800 }}>
              TOTAL RECORDED: {records.length} SOULS
            </span>
          </div>

          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <User size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p>No souls recorded yet in this session.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#008751', color: '#ffffff' }}>
                    <th style={{ padding: '10px 14px' }}>NAME</th>
                    <th style={{ padding: '10px 14px' }}>PHONE</th>
                    <th style={{ padding: '10px 14px' }}>LOCATION</th>
                    <th style={{ padding: '10px 14px' }}>CHURCH</th>
                    <th style={{ padding: '10px 14px' }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 'bold' }}>{r.name}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{r.phone}</td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>{r.location}</td>
                      <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 600 }}>{r.churchName || 'Church'}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
