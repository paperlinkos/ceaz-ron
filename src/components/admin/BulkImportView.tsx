import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  History,
  Layers,
  Users,
  Database,
  ArrowRight,
} from 'lucide-react';
import {
  downloadOrganizationTemplate,
  downloadSoulWinnerTemplate,
  downloadCSVFile,
} from '../../utils/csv';
import {
  validateOrganizationCSV,
  validateSoulWinnerCSV,
  executeOrganizationImport,
  executeSoulWinnerImport,
  getImportHistory,
  generateErrorCSV,
} from '../../services/bulkImportService';
import { useAuth } from '../../context/AuthContext';
import { ENVIRONMENT_TYPE, CURRENT_PROJECT_ID } from '../../services/firebase';
import type {
  ImportValidationResult,
  ImportHistoryRecord,
  ImportErrorDetail,
} from '../../types/import';

export const BulkImportView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'org' | 'soulWinner' | 'history'>('org');

  // Environment Safety & Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Validation results
  const [orgValidation, setOrgValidation] = useState<ImportValidationResult | null>(null);
  const [swValidation, setSwValidation] = useState<ImportValidationResult | null>(null);

  // Import configuration & progress
  const [importMode, setImportMode] = useState<'create_only' | 'create_and_update'>('create_only');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importCompleteResult, setImportCompleteResult] = useState<{
    success: boolean;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    message: string;
  } | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<ImportHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Reset file and state when switching tabs
  const handleTabChange = (tab: 'org' | 'soulWinner' | 'history') => {
    setActiveTab(tab);
    setFile(null);
    setOrgValidation(null);
    setSwValidation(null);
    setImportCompleteResult(null);
    setImportProgress(0);
    if (tab === 'history') {
      loadHistory();
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const records = await getImportHistory();
      setHistoryList(records);
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Handle CSV file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setOrgValidation(null);
    setSwValidation(null);
    setImportCompleteResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      await processValidation(text, activeTab);
    };
    reader.readAsText(selectedFile);
  };

  const processValidation = async (text: string, type: 'org' | 'soulWinner' | 'history') => {
    setIsValidating(true);
    try {
      if (type === 'org') {
        const result = await validateOrganizationCSV(text);
        setOrgValidation(result);
      } else if (type === 'soulWinner') {
        const result = await validateSoulWinnerCSV(text);
        setSwValidation(result);
      }
    } catch (err: any) {
      alert(`Validation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Download error report CSV
  const handleDownloadErrorReport = () => {
    const errors = activeTab === 'org' ? orgValidation?.errors : swValidation?.errors;
    if (!errors || errors.length === 0) return;

    const errorCsvContent = generateErrorCSV(errors);
    const filename = `${activeTab}_import_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSVFile(filename, errorCsvContent);
  };

  // Trigger Confirmation Modal
  const handleOpenConfirmModal = () => {
    if (!file || !currentUser) return;
    const currentValidation = activeTab === 'org' ? orgValidation : swValidation;
    if (!currentValidation) return;

    if (currentValidation.validRowsCount === 0) {
      alert('There are no valid rows to import.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Execute Import after Modal Confirmation
  const executeActualImport = async () => {
    if (!file || !currentUser) return;

    const currentValidation = activeTab === 'org' ? orgValidation : swValidation;
    if (!currentValidation) return;

    setShowConfirmModal(false);
    setIsImporting(true);
    setImportProgress(0);

    const actorId = currentUser.uid;
    const actorName = userProfile?.name || currentUser.email || 'SuperAdmin';
    const fileName = file.name;

    try {
      if (activeTab === 'org' && orgValidation) {
        const res = await executeOrganizationImport(
          orgValidation,
          importMode,
          actorId,
          actorName,
          fileName,
          (pct: number) => setImportProgress(pct)
        );
        setImportCompleteResult({
          success: res.status === 'completed',
          createdCount: res.createdCount,
          updatedCount: res.updatedCount,
          skippedCount: res.skippedCount,
          errorCount: res.errorCount,
          message: `Successfully processed bulk organization data: ${res.createdCount} created, ${res.updatedCount} updated, ${res.skippedCount} skipped.`,
        });
      } else if (activeTab === 'soulWinner' && swValidation) {
        const res = await executeSoulWinnerImport(
          swValidation,
          importMode,
          actorId,
          actorName,
          fileName,
          (pct: number) => setImportProgress(pct)
        );
        setImportCompleteResult({
          success: res.status === 'completed',
          createdCount: res.createdCount,
          updatedCount: res.updatedCount,
          skippedCount: res.skippedCount,
          errorCount: res.errorCount,
          message: `Successfully processed bulk Soul Winner data: ${res.createdCount} registered/pending, ${res.updatedCount} updated, ${res.skippedCount} skipped.`,
        });
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Execution error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="admin-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div className="admin-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Database size={28} style={{ color: '#008751' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
              BULK DATA IMPORT
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
              Safely validate, preview, and ingest organizational structures and Soul Winners
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              background: ENVIRONMENT_TYPE === 'PRODUCTION' ? '#fee2e2' : '#fef3c7',
              color: ENVIRONMENT_TYPE === 'PRODUCTION' ? '#dc2626' : '#b45309',
              border: `1px solid ${ENVIRONMENT_TYPE === 'PRODUCTION' ? '#fecaca' : '#fde68a'}`,
            }}
          >
            ● {ENVIRONMENT_TYPE} ({CURRENT_PROJECT_ID})
          </span>
        </div>
      </div>

      {/* Main Navigation Subtabs */}
      <div className="admin-subtabs" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => handleTabChange('org')}
          className={`subtab-btn ${activeTab === 'org' ? 'subtab-active' : ''}`}
        >
          <Layers size={16} style={{ marginRight: '6px' }} />
          Organization Import
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('soulWinner')}
          className={`subtab-btn ${activeTab === 'soulWinner' ? 'subtab-active' : ''}`}
        >
          <Users size={16} style={{ marginRight: '6px' }} />
          Soul Winner Import
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`subtab-btn ${activeTab === 'history' ? 'subtab-active' : ''}`}
        >
          <History size={16} style={{ marginRight: '6px' }} />
          Import History
        </button>
      </div>

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="account-card" style={{ background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Import Log History</h3>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="secondary-button"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} className={isLoadingHistory ? 'icon-pulse' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading history...</div>
          ) : historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              No bulk data imports have been performed yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem' }}>Administrator</th>
                    <th style={{ padding: '0.75rem' }}>File Name</th>
                    <th style={{ padding: '0.75rem' }}>Type</th>
                    <th style={{ padding: '0.75rem' }}>Rows</th>
                    <th style={{ padding: '0.75rem' }}>Created</th>
                    <th style={{ padding: '0.75rem' }}>Updated</th>
                    <th style={{ padding: '0.75rem' }}>Skipped</th>
                    <th style={{ padding: '0.75rem' }}>Errors</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{item.actorName || item.actorId}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.fileName}</td>
                      <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{item.type.replace('_', ' ')}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.totalRows}</td>
                      <td style={{ padding: '0.75rem', color: '#008751', fontWeight: 600 }}>{item.createdCount}</td>
                      <td style={{ padding: '0.75rem', color: '#1d4ed8' }}>{item.updatedCount}</td>
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>{item.skippedCount}</td>
                      <td style={{ padding: '0.75rem', color: item.errorCount > 0 ? '#dc2626' : '#6b7280' }}>
                        {item.errorCount}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: item.status === 'completed' ? '#dcfce7' : '#fee2e2',
                            color: item.status === 'completed' ? '#166534' : '#991b1b',
                          }}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* IMPORT WORKFLOW (ORG & SOUL WINNER) */}
      {activeTab !== 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Step 1: Action bar with Template Download & File Upload */}
          <div className="account-card" style={{ background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {activeTab === 'org' ? 'Organization Data CSV Upload' : 'Soul Winner Data CSV Upload'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  {activeTab === 'org'
                    ? 'Import Zones, Groups, Churches, and PCFs with parental codes.'
                    : 'Import Soul Winners with email & PCF code. Accounts will remain PENDING until authenticated.'}
                </p>
              </div>

              <div>
                {activeTab === 'org' ? (
                  <button
                    type="button"
                    onClick={downloadOrganizationTemplate}
                    className="secondary-button"
                    style={{ fontSize: '0.85rem', gap: '6px' }}
                  >
                    <Download size={16} />
                    <span>DOWNLOAD ORGANIZATION TEMPLATE</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={downloadSoulWinnerTemplate}
                    className="secondary-button"
                    style={{ fontSize: '0.85rem', gap: '6px' }}
                  >
                    <Download size={16} />
                    <span>DOWNLOAD SOUL WINNER TEMPLATE</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label
                htmlFor="csv-upload-input"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  border: '2px dashed #008751',
                  borderRadius: '8px',
                  background: '#f4fbf7',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <Upload size={32} style={{ color: '#008751', marginBottom: '0.5rem' }} />
                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
                  {file ? file.name : 'Click to select CSV file or drag & drop'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  Supported format: .CSV
                </span>
                <input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Validation Progress Spinner */}
          {isValidating && (
            <div className="account-card" style={{ background: '#fff', textAlign: 'center', padding: '2rem' }}>
              <RefreshCw size={24} className="icon-pulse" style={{ color: '#008751', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600 }}>Validating CSV data and organizational references...</div>
            </div>
          )}

          {/* Step 2 & 3: VALIDATION SUMMARY & PREVIEW */}
          {!isValidating && (orgValidation || swValidation) && (
            <>
              {/* Validation Summary Card */}
              {(() => {
                const val = activeTab === 'org' ? orgValidation! : swValidation!;
                const isOrg = activeTab === 'org';
                const orgVal = orgValidation;
                const soulVal = swValidation;

                return (
                  <div className="account-card" style={{ background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                        IMPORT VALIDATION
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>
                        {val.totalRows} rows detected
                      </span>
                    </div>

                    {/* Stats Pill Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #6b7280' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>TOTAL DETECTED</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{val.totalRows}</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #008751' }}>
                        <div style={{ fontSize: '0.8rem', color: '#166534' }}>VALID ROWS</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#008751' }}>{val.validRowsCount}</div>
                      </div>
                      <div style={{ background: val.errors.length > 0 ? '#fef2f2' : '#f8f9fa', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${val.errors.length > 0 ? '#dc2626' : '#9ca3af'}` }}>
                        <div style={{ fontSize: '0.8rem', color: val.errors.length > 0 ? '#991b1b' : '#666' }}>ERRORS</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: val.errors.length > 0 ? '#dc2626' : '#4b5563' }}>{val.errors.length}</div>
                      </div>
                    </div>

                    {/* Error Table if Any */}
                    {val.errors.length > 0 && (
                      <div style={{ marginBottom: '1.5rem', background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontWeight: 700 }}>
                            <AlertTriangle size={18} />
                            <span>Validation Errors ({val.errors.length})</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadErrorReport}
                            className="secondary-button"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#fff', border: '1px solid #dc2626', color: '#dc2626' }}
                          >
                            <Download size={14} />
                            <span>DOWNLOAD ERROR REPORT</span>
                          </button>
                        </div>

                        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#fff' }}>
                            <thead>
                              <tr style={{ background: '#fee2e2', textAlign: 'left' }}>
                                <th style={{ padding: '6px 10px' }}>Row</th>
                                <th style={{ padding: '6px 10px' }}>Field</th>
                                <th style={{ padding: '6px 10px' }}>Value</th>
                                <th style={{ padding: '6px 10px' }}>Error Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {val.errors.map((err: ImportErrorDetail, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #fee2e2' }}>
                                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>Row {err.rowIndex}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{err.field}</td>
                                  <td style={{ padding: '6px 10px', color: '#555' }}>{err.value || '(empty)'}</td>
                                  <td style={{ padding: '6px 10px', color: '#dc2626', fontWeight: 600 }}>{err.error}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* READY TO IMPORT PREVIEW CARD */}
                    <div style={{ border: '2px solid #008751', borderRadius: '8px', padding: '1.25rem', background: '#f4fbf7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: '#008751', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle size={20} />
                          <span>READY TO IMPORT PREVIEW</span>
                        </h4>
                      </div>

                      {/* Hierarchy / Counts breakdown */}
                      {isOrg && orgVal && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                          <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: '0.75rem', color: '#047857' }}>Zones</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>{orgVal.preview.zonesNew + orgVal.preview.zonesExisting}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: '0.75rem', color: '#047857' }}>Groups</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>{orgVal.preview.groupsNew + orgVal.preview.groupsExisting}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: '0.75rem', color: '#047857' }}>Churches</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>{orgVal.preview.churchesNew + orgVal.preview.churchesExisting}</div>
                          </div>
                          <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: '0.75rem', color: '#047857' }}>PCFs</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>{orgVal.preview.pcfsNew + orgVal.preview.pcfsExisting}</div>
                          </div>
                        </div>
                      )}

                      {!isOrg && soulVal && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                          <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: '0.75rem', color: '#047857' }}>Soul Winners</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065f46' }}>{soulVal.preview.soulWinnersNew + soulVal.preview.soulWinnersExisting}</div>
                          </div>
                        </div>
                      )}

                      {/* New vs Existing Breakdown */}
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', background: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>NEW Records: </span>
                          <span style={{ fontWeight: 700, color: '#008751' }}>
                            {isOrg ? orgVal?.preview.pcfsNew || 0 : soulVal?.preview.soulWinnersNew || 0}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>EXISTING Records: </span>
                          <span style={{ fontWeight: 700, color: '#1d4ed8' }}>
                            {isOrg ? orgVal?.preview.pcfsExisting || 0 : soulVal?.preview.soulWinnersExisting || 0}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>ERRORS: </span>
                          <span style={{ fontWeight: 700, color: val.errors.length > 0 ? '#dc2626' : '#6b7280' }}>
                            {val.errors.length}
                          </span>
                        </div>
                      </div>

                      {/* Import Mode Selector */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#1a1a1a' }}>
                          SELECT IMPORT MODE:
                        </label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="radio"
                              name="importMode"
                              value="create_only"
                              checked={importMode === 'create_only'}
                              onChange={() => setImportMode('create_only')}
                            />
                            <span><strong>CREATE NEW ONLY</strong> (Skip existing records)</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="radio"
                              name="importMode"
                              value="create_and_update"
                              checked={importMode === 'create_and_update'}
                              onChange={() => setImportMode('create_and_update')}
                            />
                            <span><strong>CREATE + UPDATE</strong> (Update names/hierarchy of existing codes)</span>
                          </label>
                        </div>
                      </div>

                      {/* Execution Controls */}
                      {isImporting ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                          <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#008751' }}>
                            IMPORTING DATA... {importProgress}%
                          </div>
                          <div style={{ width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${importProgress}%`,
                                height: '100%',
                                background: '#008751',
                                transition: 'width 0.2s',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenConfirmModal}
                          disabled={val.validRowsCount === 0}
                          className="submit-button"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: '#008751',
                            padding: '0.875rem',
                            fontSize: '1rem',
                          }}
                        >
                          <span>CONFIRM & EXECUTE BULK IMPORT</span>
                          <ArrowRight size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* IMPORT RESULT CARD */}
          {importCompleteResult && (
            <div
              className="account-card"
              style={{
                background: importCompleteResult.success ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${importCompleteResult.success ? '#008751' : '#dc2626'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                {importCompleteResult.success ? (
                  <CheckCircle size={32} style={{ color: '#008751' }} />
                ) : (
                  <XCircle size={32} style={{ color: '#dc2626' }} />
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: importCompleteResult.success ? '#166534' : '#991b1b' }}>
                    {importCompleteResult.success ? 'IMPORT COMPLETED SUCCESSFULLY' : 'IMPORT ENCOUNTERED ERRORS'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#4b5563' }}>
                    {importCompleteResult.message}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>CREATED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#008751' }}>
                    {importCompleteResult.createdCount}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>UPDATED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                    {importCompleteResult.updatedCount}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>SKIPPED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4b5563' }}>
                    {importCompleteResult.skippedCount}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>ERRORS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: importCompleteResult.errorCount > 0 ? '#dc2626' : '#6b7280' }}>
                    {importCompleteResult.errorCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUCTION DATA IMPORT CONFIRMATION MODAL */}
      {showConfirmModal && file && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '540px' }}>
            <AlertTriangle size={36} className="text-warning mx-auto" style={{ color: ENVIRONMENT_TYPE === 'PRODUCTION' ? '#dc2626' : '#f5b700' }} />
            <h3 className="modal-title text-center" style={{ color: ENVIRONMENT_TYPE === 'PRODUCTION' ? '#dc2626' : '#b45309' }}>
              {ENVIRONMENT_TYPE === 'PRODUCTION' ? 'PRODUCTION DATA IMPORT' : 'DEVELOPMENT DATA IMPORT'}
            </h3>
            <p className="modal-subtitle text-center" style={{ marginBottom: '1rem' }}>
              You are about to modify <strong>{ENVIRONMENT_TYPE}</strong> Reach Out Nigeria database records.
            </p>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                <div><strong>Target Environment:</strong></div>
                <div style={{ fontWeight: 800, color: ENVIRONMENT_TYPE === 'PRODUCTION' ? '#dc2626' : '#b45309' }}>
                  {ENVIRONMENT_TYPE} ({CURRENT_PROJECT_ID})
                </div>

                <div><strong>File Name:</strong></div>
                <div>{file.name}</div>

                <div><strong>Import Category:</strong></div>
                <div>{activeTab === 'org' ? 'Organizational Hierarchy' : 'Soul Winners'}</div>

                <div><strong>Total Rows in File:</strong></div>
                <div>{activeTab === 'org' ? orgValidation?.totalRows : swValidation?.totalRows}</div>

                <div><strong>Valid Rows to Import:</strong></div>
                <div style={{ color: '#008751', fontWeight: 800 }}>
                  {activeTab === 'org' ? orgValidation?.validRowsCount : swValidation?.validRowsCount}
                </div>

                <div><strong>Error Rows:</strong></div>
                <div style={{ color: (activeTab === 'org' ? orgValidation?.errors.length : swValidation?.errors.length) ? '#dc2626' : '#6b7280', fontWeight: 700 }}>
                  {activeTab === 'org' ? orgValidation?.errors.length : swValidation?.errors.length}
                </div>

                <div><strong>Import Mode:</strong></div>
                <div>{importMode === 'create_only' ? 'Create New Only' : 'Create + Update Metadata'}</div>
              </div>
            </div>

            <div className="historical-notice-box" style={{ marginBottom: '1.25rem' }}>
              <strong>HISTORICAL DATA GUARANTEE:</strong> Existing soul-winning records and past attributions will remain strictly untouched and preserved.
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="secondary-button"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={executeActualImport}
                className="submit-button"
                style={{ background: ENVIRONMENT_TYPE === 'PRODUCTION' ? '#dc2626' : '#008751' }}
              >
                CONFIRM & WRITE TO {ENVIRONMENT_TYPE}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
