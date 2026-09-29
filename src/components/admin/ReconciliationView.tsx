import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Target as TargetIcon,
} from 'lucide-react';
import {
  reconcileOrganizations,
  reconcileUsers,
  reconcileTargets,
  type OrganizationReconciliationReport,
  type UserReconciliationReport,
  type TargetReconciliationReport,
} from '../../services/reconciliationService';
import {
  detectDuplicateSouls,
  type DuplicateResolutionReport,
} from '../../services/duplicateDetectionService';

export const ReconciliationView: React.FC = () => {
  const [orgReport, setOrgReport] = useState<OrganizationReconciliationReport | null>(null);
  const [userReport, setUserReport] = useState<UserReconciliationReport | null>(null);
  const [targetReport, setTargetReport] = useState<TargetReconciliationReport | null>(null);
  const [dupReport, setDupReport] = useState<DuplicateResolutionReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const runReconciliation = async () => {
    setIsLoading(true);
    try {
      const [oRep, uRep, tRep, dRep] = await Promise.all([
        reconcileOrganizations(),
        reconcileUsers(),
        reconcileTargets(),
        detectDuplicateSouls(),
      ]);
      setOrgReport(oRep);
      setUserReport(uRep);
      setTargetReport(tRep);
      setDupReport(dRep);
    } catch (err) {
      console.error('Failed to run reconciliation reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runReconciliation();
  }, []);

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={22} style={{ color: '#008751' }} />
            <span>SYSTEM RECONCILIATION AUDIT</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
            Administrative sanity checks for hierarchy orphan nodes, duplicate codes, user status, and target coverage.
          </p>
        </div>

        <button
          onClick={runReconciliation}
          disabled={isLoading}
          className="secondary-button"
          style={{ fontSize: '0.85rem', gap: '6px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'icon-pulse' : ''} />
          <span>RE-RUN RECONCILIATION</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <RefreshCw size={24} className="icon-pulse" style={{ color: '#008751', marginBottom: '0.5rem' }} />
          <div>Reconciling database records and structural entities...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. ORGANIZATION RECONCILIATION CARD */}
          {orgReport && (
            <div style={{ border: `1px solid ${orgReport.isHealthy ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '1.25rem', background: orgReport.isHealthy ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                {orgReport.isHealthy ? (
                  <CheckCircle2 size={20} style={{ color: '#166534' }} />
                ) : (
                  <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                )}
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: orgReport.isHealthy ? '#166534' : '#991b1b' }}>
                  ORGANIZATION HIERARCHY RECONCILIATION — {orgReport.isHealthy ? 'HEALTHY' : 'ISSUES DETECTED'}
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>ZONES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orgReport.totalZones}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>GROUPS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orgReport.totalGroups}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>CHURCHES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orgReport.totalChurches}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>PCFs</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orgReport.totalPcfs}</div>
                </div>
              </div>

              {!orgReport.isHealthy && (
                <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                  {orgReport.orphanGroups.length > 0 && <div>• Orphan Groups ({orgReport.orphanGroups.length}): {orgReport.orphanGroups.map((g) => g.name).join(', ')}</div>}
                  {orgReport.orphanChurches.length > 0 && <div>• Orphan Churches ({orgReport.orphanChurches.length}): {orgReport.orphanChurches.map((c) => c.name).join(', ')}</div>}
                  {orgReport.orphanPcfs.length > 0 && <div>• Orphan PCFs ({orgReport.orphanPcfs.length}): {orgReport.orphanPcfs.map((p) => p.name).join(', ')}</div>}
                  {orgReport.duplicateCodes.length > 0 && <div>• Duplicate Codes ({orgReport.duplicateCodes.length}): {orgReport.duplicateCodes.map((d) => d.code).join(', ')}</div>}
                </div>
              )}
            </div>
          )}

          {/* 2. USER RECONCILIATION CARD */}
          {userReport && (
            <div style={{ border: `1px solid ${userReport.isHealthy ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '1.25rem', background: userReport.isHealthy ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                {userReport.isHealthy ? (
                  <CheckCircle2 size={20} style={{ color: '#166534' }} />
                ) : (
                  <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                )}
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: userReport.isHealthy ? '#166534' : '#991b1b' }}>
                  USER & SOUL WINNER ONBOARDING RECONCILIATION — {userReport.isHealthy ? 'HEALTHY' : 'ACTION NEEDED'}
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>TOTAL USERS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{userReport.totalUsers}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534' }}>ACTIVE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#008751' }}>{userReport.activeCount}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#d97706' }}>PENDING</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{userReport.pendingCount}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>SUSPENDED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{userReport.suspendedCount}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>DISABLED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4b5563' }}>{userReport.disabledCount}</div>
                </div>
              </div>

              {!userReport.isHealthy && (
                <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                  {userReport.unassignedSoulWinners.length > 0 && (
                    <div>• Unassigned Soul Winners ({userReport.unassignedSoulWinners.length}): {userReport.unassignedSoulWinners.map((u) => u.name).join(', ')}</div>
                  )}
                  {userReport.invalidPcfUsers.length > 0 && (
                    <div>• Users with Invalid PCF Reference ({userReport.invalidPcfUsers.length}): {userReport.invalidPcfUsers.map((u) => u.name).join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. DUPLICATE SOULS RECONCILIATION CARD */}
          {dupReport && (
            <div style={{ border: `1px solid ${dupReport.isHealthy ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '1.25rem', background: dupReport.isHealthy ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {dupReport.isHealthy ? (
                    <CheckCircle2 size={20} style={{ color: '#166534' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                  )}
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: dupReport.isHealthy ? '#166534' : '#991b1b' }}>
                    DUPLICATE SOULS RECONCILIATION — {dupReport.isHealthy ? 'NO CONFLICTS' : `${dupReport.duplicateGroups.length} CONFLICTS DETECTED`}
                  </h4>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>RECORDS SCANNED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{dupReport.totalRecordsScanned.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: dupReport.duplicateGroups.length > 0 ? '#dc2626' : '#666' }}>CONFLICT GROUPS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: dupReport.duplicateGroups.length > 0 ? '#dc2626' : '#166534' }}>{dupReport.duplicateGroups.length}</div>
                </div>
                <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>FLAGGED RECORDS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: dupReport.totalFlaggedCount > 0 ? '#b45309' : '#166534' }}>{dupReport.totalFlaggedCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TARGET RECONCILIATION CARD */}
          {targetReport && (
            <div style={{ border: `1px solid ${targetReport.isHealthy ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '8px', padding: '1.25rem', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <TargetIcon size={20} style={{ color: '#008751' }} />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a' }}>
                  TARGET COVERAGE RECONCILIATION
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>TOTAL COVERED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{targetReport.items.length}</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>TARGET NOT SET</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>{targetReport.missingTargetsCount}</div>
                </div>
                <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>ZERO TARGETS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{targetReport.zeroTargetsCount}</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>INACTIVE ORGS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4b5563' }}>{targetReport.inactiveOrgsWithTargetsCount}</div>
                </div>
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '6px 10px' }}>Level</th>
                      <th style={{ padding: '6px 10px' }}>Organization</th>
                      <th style={{ padding: '6px 10px' }}>Target</th>
                      <th style={{ padding: '6px 10px' }}>Actual</th>
                      <th style={{ padding: '6px 10px' }}>Progress</th>
                      <th style={{ padding: '6px 10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetReport.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '6px 10px', textTransform: 'uppercase', fontWeight: 600 }}>{item.level}</td>
                        <td style={{ padding: '6px 10px' }}>{item.organizationName} ({item.organizationCode || 'N/A'})</td>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{item.target ? item.target.toLocaleString() : '—'}</td>
                        <td style={{ padding: '6px 10px', color: '#008751', fontWeight: 700 }}>{item.actual.toLocaleString()}</td>
                        <td style={{ padding: '6px 10px' }}>{item.target ? `${item.percentage}%` : '—'}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background:
                                item.status === 'active'
                                  ? '#dcfce7'
                                  : item.status === 'target_not_set'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color:
                                item.status === 'active'
                                  ? '#166534'
                                  : item.status === 'target_not_set'
                                  ? '#92400e'
                                  : '#991b1b',
                            }}
                          >
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
