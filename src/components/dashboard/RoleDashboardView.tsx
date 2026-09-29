import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Building,
  ShieldAlert,
  Flame,
  Sparkles,
  Upload,
  User,
  Phone,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardViewData, type DashboardViewData, type BreadcrumbItem } from '../../services/dashboardService';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { subscribeToSyncStatus } from '../../services/syncService';
import type { TargetLevel } from '../../types/target';
import type { SoulWinningRecord } from '../../types/record';

interface RoleDashboardViewProps {
  onNavigateTab: (tab: 'home' | 'record' | 'account' | 'org' | 'race' | 'about') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const RoleDashboardView: React.FC<RoleDashboardViewProps> = ({ onNavigateTab, onOpenAuth }) => {
  const { userProfile, soulWinnerProfile, isAuthenticated } = useAuth();

  const [data, setData] = useState<DashboardViewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [selectedLevel, setSelectedLevel] = useState<TargetLevel | undefined>(undefined);

  // Real-time local records for spiritual breakdown & recent uploads
  const [allRecords, setAllRecords] = useState<SoulWinningRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadDashboard();
    loadRecords();

    const unsubscribe = subscribeToSyncStatus(() => {
      loadDashboard();
      loadRecords();
    });

    return () => unsubscribe();
  }, [userProfile, soulWinnerProfile, selectedOrgId, selectedLevel]);

  const loadRecords = async () => {
    try {
      const items = await getAllLocalRecords();
      setAllRecords(items);
    } catch (err) {
      console.warn('Failed to load local records in dashboard:', err);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDashboardViewData(
        userProfile,
        soulWinnerProfile,
        selectedOrgId,
        selectedLevel
      );
      setData(res);
    } catch (err) {
      console.warn('Failed to load dashboard view data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrillDown = (childId: string, childLevel: TargetLevel) => {
    setSelectedOrgId(childId);
    setSelectedLevel(childLevel);
  };

  const handleBreadcrumbClick = (crumb: BreadcrumbItem) => {
    setSelectedOrgId(crumb.id);
    setSelectedLevel(crumb.level);
  };

  if (!isAuthenticated) {
    return (
      <div className="account-card empty-card">
        <ShieldAlert size={36} className="text-gold" />
        <h3 className="account-title">Sign In Required</h3>
        <p className="account-lead">
          Monitoring dashboards require an authenticated Church Representative or Pastor account.
        </p>
        <div className="sidebar-auth-btns" style={{ width: '220px', marginTop: '12px' }}>
          <button onClick={() => onOpenAuth('login')} className="btn-green-accent btn-large">
            Sign In to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="account-card empty-card">
        <p className="loading-text">Loading monitoring metrics...</p>
      </div>
    );
  }

  // Filter records matching the active entity
  const relevantRecords = allRecords.filter((r) => {
    if (data.activeLevel === 'church') {
      return r.churchId === data.activeOrgId;
    }
    if (data.activeLevel === 'group') {
      return r.groupId === data.activeOrgId;
    }
    return true; // Zone level matches all
  });

  const bornAgainCount = relevantRecords.filter((r) => r.isBornAgain !== false).length;
  const holySpiritCount = relevantRecords.filter((r) => r.isFilledWithHolySpirit !== false).length;

  const bornAgainPct = relevantRecords.length > 0 ? Math.round((bornAgainCount / relevantRecords.length) * 100) : 100;
  const holySpiritPct = relevantRecords.length > 0 ? Math.round((holySpiritCount / relevantRecords.length) * 100) : 100;

  // Filter for search inside church uploads
  const filteredUploads = relevantRecords.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.phone.includes(q);
  });

  return (
    <div className="dashboard-container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px' }}>
      {/* INTERACTIVE BREADCRUMBS */}
      <nav className="breadcrumbs-bar" aria-label="Hierarchy Breadcrumbs" style={{ marginBottom: '16px' }}>
        {data.breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            {idx > 0 && <ChevronRight size={14} className="breadcrumb-arrow" />}
            <button
              onClick={() => handleBreadcrumbClick(crumb)}
              className={`breadcrumb-item ${crumb.id === data.activeOrgId ? 'breadcrumb-active' : ''}`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* MONITORING HERO CARD */}
      <div
        className="account-card dashboard-hero-card"
        style={{
          background: 'linear-gradient(135deg, #071710 0%, #0d2a1d 100%)',
          color: '#ffffff',
          border: '1px solid rgba(0, 135, 81, 0.4)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0, 135, 81, 0.3)',
                color: '#4ade80',
                border: '1px solid #008751',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}
            >
              <Building size={14} />
              <span>{data.activeLevel.toUpperCase()} MONITORING</span>
            </div>
            <div className="live-status-pill">
              <span className="live-dot" />
              <span>LIVE TRACKING</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('record')}
            className="submit-button"
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              width: 'auto',
            }}
          >
            <Upload size={16} />
            <span>Upload Souls</span>
          </button>
        </div>

        <div className="dashboard-hero-header">
          <h1 className="dashboard-org-title" style={{ fontSize: '1.8rem', color: '#ffffff', margin: '0 0 4px 0' }}>
            {data.activeOrgName}
          </h1>
          <p className="dashboard-org-subtitle" style={{ color: '#94a3b8', fontSize: '0.86rem', margin: 0 }}>
            Real-time soul harvest metrics and target tracking for {data.activeLevel.toUpperCase()}.
          </p>
        </div>

        {/* HERO TARGET PROGRESS METRIC */}
        <div className="dashboard-metrics-container" style={{ marginTop: '20px' }}>
          <div className="dashboard-stat-row">
            <div className="dash-metric-big">
              <span className="metric-label" style={{ color: '#94a3b8' }}>SOULS WON / TARGET</span>
              <div className="metric-number-group">
                <span className="metric-actual" style={{ color: '#00ff87' }}>{data.actual.toLocaleString()}</span>
                <span className="metric-slash" style={{ color: '#64748b' }}>/</span>
                <span className="metric-target" style={{ color: '#FFD700' }}>{data.target.toLocaleString()} SOULS</span>
              </div>
            </div>

            <div className="dash-percentage-badge">
              <span className="dash-pct-text">{data.displayPercentage}</span>
              {data.isTargetExceeded && (
                <span className="exceeded-tag" title="Target Exceeded!">
                  <span>EXCEEDED</span>
                </span>
              )}
            </div>
          </div>

          {/* Full Width Progress Bar */}
          <div className="national-progress-track" style={{ height: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)' }}>
            <div
              className={`national-progress-fill ${data.isTargetExceeded ? 'progress-exceeded' : ''}`}
              style={{ width: `${Math.min(100, (data.normalizedProgress || 0) * 100)}%`, borderRadius: '8px' }}
            />
          </div>

          <div className="dash-remaining-row" style={{ marginTop: '10px' }}>
            <span className="remaining-text" style={{ color: '#cbd5e1' }}>
              <strong>{data.remainingTarget.toLocaleString()}</strong> SOULS REMAINING TO REACH TARGET
            </span>
            <span className="target-status-badge">
              {data.isTargetExceeded ? (
                <span className="text-green-accent flex-inline-gap" style={{ color: '#4ade80' }}>
                  <CheckCircle2 size={14} /> TARGET EXCEEDED!
                </span>
              ) : (
                <span className="text-muted flex-inline-gap" style={{ color: '#94a3b8' }}>
                  <TrendingUp size={14} /> IN PROGRESS
                </span>
              )}
            </span>
          </div>
        </div>

        {/* SPIRITUAL HARVEST BREAKDOWN TILES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '24px' }}>
          <div
            style={{
              background: 'rgba(0, 135, 81, 0.2)',
              border: '1px solid rgba(0, 135, 81, 0.4)',
              borderRadius: '12px',
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
              <Sparkles size={16} />
              <span>Born Again Converts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{bornAgainCount.toLocaleString()}</span>
              <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 700 }}>({bornAgainPct}%)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              Confirmed confessions of faith in Jesus Christ
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 215, 0, 0.12)',
              border: '1px solid rgba(255, 215, 0, 0.35)',
              borderRadius: '12px',
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFD700', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
              <Flame size={16} />
              <span>Filled with Holy Spirit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{holySpiritCount.toLocaleString()}</span>
              <span style={{ fontSize: '0.82rem', color: '#FFD700', fontWeight: 700 }}>({holySpiritPct}%)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              Received the Holy Spirit with speaking in tongues
            </div>
          </div>
        </div>
      </div>

      {/* DRILL-DOWN ENTITIES (When at Zone or Group Level) */}
      {data.activeLevel !== 'church' && (
        <div className="account-card dashboard-children-card" style={{ marginBottom: '20px' }}>
          <div className="children-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="children-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              {data.activeLevel === 'zone' ? 'GROUPS IN ABUJA ZONE 1 (20 GROUPS)' : 'CHURCHES IN THIS GROUP'}
            </h3>
            <span className="text-muted text-sm" style={{ color: '#64748b' }}>
              {data.children.length} {data.activeLevel === 'zone' ? 'Groups' : 'Churches'}
            </span>
          </div>

          <div className="children-list-grid">
            {data.children.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '20px' }}>
                No entities found under this {data.activeLevel.toUpperCase()}.
              </p>
            ) : (
              data.children.map((child) => (
                <div
                  key={child.organizationId}
                  onClick={() => handleDrillDown(child.organizationId, child.level)}
                  className="child-entity-card"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="child-card-top">
                    <div className="child-name-group">
                      <span className="child-name" style={{ fontWeight: 800 }}>{child.organizationName}</span>
                      {child.organizationCode && <span className="child-code">({child.organizationCode})</span>}
                    </div>
                    <div className="child-pct-pill">
                      <span>{child.displayPercentage}</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  <div className="child-card-middle" style={{ margin: '10px 0' }}>
                    <div className="child-progress-track">
                      <div
                        className="child-progress-fill"
                        style={{ width: `${Math.min(100, (child.normalizedProgress || 0) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="child-card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="child-stat-text">
                      <strong>{child.actual.toLocaleString()}</strong> / {child.target.toLocaleString()} SOULS
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#008751', fontWeight: 700 }}>
                      Click to monitor →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RECENT UPLOADS LOG (When at Church Level) */}
      {data.activeLevel === 'church' && (
        <div className="account-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Souls Upload Log for {data.activeOrgName}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Total recorded: <strong>{relevantRecords.length} souls</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="input-wrapper search-wrapper" style={{ width: '220px' }}>
                <Search size={15} className="input-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter souls..."
                  className="form-input search-input"
                  style={{ padding: '6px 10px 6px 32px', fontSize: '0.8rem' }}
                />
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('record')}
                style={{
                  background: '#008751',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                <span>Upload New Souls</span>
              </button>
            </div>
          </div>

          {filteredUploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.9rem' }}>
                No souls recorded for {data.activeOrgName} yet.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('record')}
                className="submit-button"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              >
                <Upload size={16} />
                <span>Record First Soul Now</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Soul Name</th>
                    <th style={{ padding: '10px 14px' }}>Phone Number</th>
                    <th style={{ padding: '10px 14px' }}>Born Again</th>
                    <th style={{ padding: '10px 14px' }}>Filled with Holy Spirit</th>
                    <th style={{ padding: '10px 14px' }}>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUploads.map((record, idx) => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#008751" />
                          <span>{record.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#64748b" />
                          <span>{record.phone}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: record.isBornAgain !== false ? 'rgba(0, 135, 81, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                            color: record.isBornAgain !== false ? '#008751' : '#dc2626',
                          }}
                        >
                          {record.isBornAgain !== false ? '✨ Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: record.isFilledWithHolySpirit !== false ? 'rgba(255, 215, 0, 0.18)' : 'rgba(239, 68, 68, 0.1)',
                            color: record.isFilledWithHolySpirit !== false ? '#b45309' : '#dc2626',
                          }}
                        >
                          {record.isFilledWithHolySpirit !== false ? '🔥 Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.76rem' }}>
                        {new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
