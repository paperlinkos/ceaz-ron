import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Search,
  Trash2,
  GitMerge,
  UserCheck,
  Phone,
  MapPin,
  Church as ChurchIcon,
  Calendar,
} from 'lucide-react';
import {
  detectDuplicateSouls,
  resolveDeleteDuplicates,
  resolveMergeRecords,
  resolveMarkAsUnique,
  type DuplicateResolutionReport,
} from '../../services/duplicateDetectionService';
import type { SoulWinningRecord } from '../../types/record';

export const DuplicateResolutionsView: React.FC = () => {
  const [report, setReport] = useState<DuplicateResolutionReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'high' | 'medium'>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const runScan = async () => {
    setIsLoading(true);
    setActionSuccess(null);
    try {
      const rep = await detectDuplicateSouls();
      setReport(rep);
    } catch (err) {
      console.error('Failed to run duplicate detection scan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const handleDeleteDuplicate = async (dupId: string, name: string) => {
    try {
      await resolveDeleteDuplicates([dupId]);
      setActionSuccess(`Successfully deleted duplicate record for "${name}".`);
      await runScan();
    } catch (err) {
      console.error('Failed to delete duplicate:', err);
    }
  };

  const handleMergeRecords = async (primary: SoulWinningRecord, dup: SoulWinningRecord) => {
    try {
      await resolveMergeRecords(primary, dup);
      setActionSuccess(`Successfully merged record for "${primary.name}".`);
      await runScan();
    } catch (err) {
      console.error('Failed to merge records:', err);
    }
  };

  const handleMarkAsUnique = async (primaryId: string, dupId: string, name: string) => {
    try {
      await resolveMarkAsUnique(primaryId, dupId);
      setActionSuccess(`Marked "${name}" entries as distinct unique individuals.`);
      await runScan();
    } catch (err) {
      console.error('Failed to mark as unique:', err);
    }
  };

  const filteredGroups = report?.duplicateGroups.filter((g) => {
    if (filterType === 'high' && g.confidence !== 'high') return false;
    if (filterType === 'medium' && g.confidence !== 'medium') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.primaryRecord.name.toLowerCase().includes(q) ||
      g.primaryRecord.phone.includes(q) ||
      g.primaryRecord.location.toLowerCase().includes(q) ||
      g.duplicateRecords.some((d) => d.name.toLowerCase().includes(q) || d.phone.includes(q))
    );
  }) || [];

  return (
    <div style={{ background: '#0a1912', color: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(0, 135, 81, 0.4)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={24} color="#FFD700" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
              DUPLICATE SOULS RESOLUTIONS ENGINE
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Flag & resolve duplicate soul entries using phone number, first name, and location reconciliation.
          </p>
        </div>

        <button
          onClick={runScan}
          disabled={isLoading}
          className="submit-button"
          style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'SCANNING...' : 'RE-SCAN DATABASE'}</span>
        </button>
      </div>

      {actionSuccess && (
        <div style={{ background: 'rgba(0, 135, 81, 0.25)', border: '1px solid #008751', color: '#4ade80', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', fontWeight: 'bold' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* METRICS & SUMMARY BOX */}
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold' }}>TOTAL SOULS SCANNED</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>{report.totalRecordsScanned.toLocaleString()}</div>
          </div>

          <div style={{ background: report.isHealthy ? 'rgba(0,135,81,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${report.isHealthy ? '#008751' : '#ef4444'}`, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: report.isHealthy ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>DUPLICATE CONFLICTS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: report.isHealthy ? '#4ade80' : '#f87171', marginTop: '2px' }}>{report.duplicateGroups.length}</div>
          </div>

          <div style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#FFD700', fontWeight: 'bold' }}>FLAGGED RECORDS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#FFD700', marginTop: '2px' }}>{report.totalFlaggedCount}</div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem', background: '#12291d', padding: '12px', borderRadius: '10px' }}>
        <div style={{ position: 'relative', minWidth: '240px', flex: '1' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or location..."
            className="form-input"
            style={{ paddingLeft: '32px', fontSize: '0.82rem', padding: '6px 12px 6px 32px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              background: filterType === 'all' ? '#008751' : 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            All ({report?.duplicateGroups.length || 0})
          </button>
          <button
            onClick={() => setFilterType('high')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              background: filterType === 'high' ? '#dc2626' : 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            🔴 Phone Matches
          </button>
          <button
            onClick={() => setFilterType('medium')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              background: filterType === 'medium' ? '#d97706' : 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            🟡 First Name + Location Matches
          </button>
        </div>
      </div>

      {/* CONFLICT LIST */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: '#008751', marginBottom: '8px' }} />
          <div>Scanning database for phone & first name duplicates...</div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 20px', background: 'rgba(0, 135, 81, 0.1)', border: '1px dashed #008751', borderRadius: '12px' }}>
          <CheckCircle2 size={40} color="#4ade80" style={{ marginBottom: '8px' }} />
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>NO DUPLICATE CONFLICTS FOUND</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            All soul winning records across the campaign are clean and verified unique.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredGroups.map((group) => {
            const isHigh = group.confidence === 'high';

            return (
              <div
                key={group.id}
                style={{
                  background: 'rgba(13, 31, 24, 0.9)',
                  border: isHigh ? '1px solid #ef4444' : '1px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                {/* CONFLICT CARD TOP BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '900',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isHigh ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                        color: isHigh ? '#f87171' : '#fbbf24',
                        border: isHigh ? '1px solid #ef4444' : '1px solid #f59e0b',
                      }}
                    >
                      {isHigh ? '🔴 HIGH CONFIDENCE MATCH' : '🟡 MEDIUM CONFIDENCE MATCH'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 'bold' }}>
                      {group.matchReason}
                    </span>
                  </div>
                </div>

                {/* SIDE-BY-SIDE RECORDS COMPARISON */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  {/* PRIMARY RECORD */}
                  <div style={{ background: 'rgba(0, 135, 81, 0.15)', border: '1px solid #008751', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: '900', marginBottom: '6px' }}>
                      ⭐ PRIMARY RECORD (KEEP CANDIDATE)
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff' }}>{group.primaryRecord.name}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <div><Phone size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Phone:</strong> {group.primaryRecord.phone}</div>
                      <div><MapPin size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Location:</strong> {group.primaryRecord.location}</div>
                      <div><ChurchIcon size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Church:</strong> {group.primaryRecord.churchName || 'Church'}</div>
                      <div><Calendar size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Recorded:</strong> {new Date(group.primaryRecord.createdAt).toLocaleString()}</div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        {group.primaryRecord.isBornAgain !== false && <span style={{ fontSize: '0.65rem', background: 'rgba(0, 135, 81, 0.3)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>✨ Born Again</span>}
                        {group.primaryRecord.isFilledWithHolySpirit !== false && <span style={{ fontSize: '0.65rem', background: 'rgba(255, 215, 0, 0.2)', color: '#FFD700', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔥 Spirit Filled</span>}
                      </div>
                    </div>
                  </div>

                  {/* DUPLICATE CANDIDATE(S) */}
                  {group.duplicateRecords.map((dup) => (
                    <div key={dup.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: '900', marginBottom: '6px' }}>
                        ⚠️ DUPLICATE CANDIDATE
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff' }}>{dup.name}</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        <div><Phone size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Phone:</strong> {dup.phone}</div>
                        <div><MapPin size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Location:</strong> {dup.location}</div>
                        <div><ChurchIcon size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Church:</strong> {dup.churchName || 'Church'}</div>
                        <div><Calendar size={12} style={{ display: 'inline', marginRight: '6px' }} /><strong>Recorded:</strong> {new Date(dup.createdAt).toLocaleString()}</div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          {dup.isBornAgain !== false && <span style={{ fontSize: '0.65rem', background: 'rgba(0, 135, 81, 0.3)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>✨ Born Again</span>}
                          {dup.isFilledWithHolySpirit !== false && <span style={{ fontSize: '0.65rem', background: 'rgba(255, 215, 0, 0.2)', color: '#FFD700', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔥 Spirit Filled</span>}
                        </div>
                      </div>

                      {/* RESOLUTION ACTIONS FOR THIS CANDIDATE */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <button
                          onClick={() => handleMergeRecords(group.primaryRecord, dup)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 'bold',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <GitMerge size={12} /> MERGE INTO PRIMARY
                        </button>

                        <button
                          onClick={() => handleDeleteDuplicate(dup.id, dup.name)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 'bold',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={12} /> DELETE DUPLICATE
                        </button>

                        <button
                          onClick={() => handleMarkAsUnique(group.primaryRecord.id, dup.id, dup.name)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 'bold',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <UserCheck size={12} /> MARK AS UNIQUE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
