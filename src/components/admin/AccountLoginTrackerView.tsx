import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllAccountsWithLoginStatus,
  exportLoggedInAccountsCSV,
  type AccountLoginRecord,
  type AccountLoginSummary,
} from '../../services/loginTrackerService';
import { DEFAULT_GROUPS } from '../../services/organizationService';

interface AccountLoginTrackerViewProps {
  onNavigate?: (tab: any) => void;
  isEmbedded?: boolean;
}

export const AccountLoginTrackerView: React.FC<AccountLoginTrackerViewProps> = ({
  onNavigate,
  isEmbedded = false,
}) => {
  const { role, isRoleVerified } = useAuth();
  const isSuperAdmin = role === 'superAdmin' && isRoleVerified;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allAccounts, setAllAccounts] = useState<AccountLoginRecord[]>([]);
  const [summary, setSummary] = useState<AccountLoginSummary>({
    totalAccounts: 0,
    loggedInCount: 0,
    neverLoggedInCount: 0,
    percentageLoggedIn: 0,
    churchAccountsTotal: 0,
    churchAccountsLoggedIn: 0,
    groupAccountsTotal: 0,
    groupAccountsLoggedIn: 0,
    adminAccountsTotal: 0,
    adminAccountsLoggedIn: 0,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'logged_in' | 'never_logged_in' | 'all' | 'churches' | 'groups'>('logged_in');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getAllAccountsWithLoginStatus();
      setAllAccounts(res.allAccounts);
      setSummary(res.summary);
    } catch (err) {
      console.error('[LoginTrackerView] Failed to load login records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter accounts according to tab, group, and search query
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter((acc) => {
      // 1. Tab filter
      if (filterTab === 'logged_in' && !acc.hasLoggedIn) return false;
      if (filterTab === 'never_logged_in' && acc.hasLoggedIn) return false;
      if (filterTab === 'churches' && acc.role !== 'churchManager') return false;
      if (filterTab === 'groups' && acc.role !== 'groupManager') return false;

      // 2. Group filter
      if (selectedGroup !== 'all' && acc.groupId !== selectedGroup && acc.groupName !== selectedGroup) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (acc.churchName || acc.accountName || '').toLowerCase().includes(q);
        const codeMatch = (acc.churchCode || '').toLowerCase().includes(q);
        const emailMatch = (acc.email || '').toLowerCase().includes(q);
        const groupMatch = (acc.groupName || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !emailMatch && !groupMatch) return false;
      }

      return true;
    });
  }, [allAccounts, filterTab, selectedGroup, searchQuery]);

  if (!isSuperAdmin) {
    return (
      <div className="account-card" style={{ maxWidth: '640px', margin: '40px auto', padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', marginBottom: '16px' }}>
          <AlertCircle size={36} />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Super Admin Access Required
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '24px' }}>
          The Account Login & Access Tracker is strictly restricted to verified Christ Embassy Abuja Zone 1 Super Administrators.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('account')}
            className="submit-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} />
            <span>Return to Account</span>
          </button>
        )}
      </div>
    );
  }

  const formatDateTime = (iso?: string) => {
    if (!iso) return 'Never';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="login-tracker-page-wrapper" style={{ maxWidth: '1280px', margin: '0 auto', padding: isEmbedded ? '0' : '24px 16px' }}>
      {/* Top Navigation Row */}
      {!isEmbedded && onNavigate && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => onNavigate('account')}
            className="btn-back-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#008751', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to My Account</span>
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="account-card dashboard-hero-card" style={{ background: 'linear-gradient(135deg, #051a11 0%, #0d2e20 100%)', color: '#ffffff', border: '1px solid rgba(0, 135, 81, 0.4)', padding: '28px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(0, 200, 83, 0.2)', border: '1px solid rgba(0, 200, 83, 0.4)', borderRadius: '100px', color: '#00c853', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              <ShieldCheck size={14} />
              <span>SUPER ADMIN ONLY • ACCESS & LOGIN AUDIT</span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              ACCOUNT LOGIN TRACKER
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, maxWidth: '640px' }}>
              Real-time audit of all church representatives, coordinators, and administrators in CEAZ1 who have authenticated into the ReachOut Nigeria platform at least once.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="display-mode-trigger-btn"
              style={{ background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
              title="Refresh live login data"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Refreshing…' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => exportLoggedInAccountsCSV(filteredAccounts)}
              className="display-mode-trigger-btn"
              style={{ background: 'linear-gradient(135deg, #008751 0%, #006e42 100%)', color: '#ffffff', border: 'none' }}
              title="Export filtered accounts to Excel CSV"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* STATS STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LOGGED IN AT LEAST ONCE
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#00c853', lineHeight: 1 }}>
                {summary.loggedInCount}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                / {summary.totalAccounts} total ({summary.percentageLoggedIn}%)
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CHURCH REPS AUTHENTICATED
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                {summary.churchAccountsLoggedIn}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                / {summary.churchAccountsTotal} Churches
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GROUPS WITH ACTIVE SIGN-IN
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                {summary.groupAccountsLoggedIn}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                / {summary.groupAccountsTotal} Groups
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PENDING FIRST SIGN-IN
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                {summary.neverLoggedInCount}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                dormant accounts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="account-card" style={{ padding: '16px 20px', marginBottom: '20px', borderRadius: '14px', background: '#ffffff', border: '1px solid var(--color-card-border-public)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterTab('logged_in')}
              className={`subtab-btn ${filterTab === 'logged_in' ? 'subtab-active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
            >
              Logged In ({summary.loggedInCount})
            </button>

            <button
              onClick={() => setFilterTab('never_logged_in')}
              className={`subtab-btn ${filterTab === 'never_logged_in' ? 'subtab-active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
            >
              Pending First Login ({summary.neverLoggedInCount})
            </button>

            <button
              onClick={() => setFilterTab('churches')}
              className={`subtab-btn ${filterTab === 'churches' ? 'subtab-active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
            >
              Churches ({summary.churchAccountsTotal})
            </button>

            <button
              onClick={() => setFilterTab('groups')}
              className={`subtab-btn ${filterTab === 'groups' ? 'subtab-active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
            >
              Groups ({summary.groupAccountsTotal})
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`subtab-btn ${filterTab === 'all' ? 'subtab-active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
            >
              All ({summary.totalAccounts})
            </button>
          </div>

          {/* Search & Group Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', justifyContent: 'flex-end' }}>
            {/* Group dropdown filter */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: '160px', padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <option value="all">All Groups ({DEFAULT_GROUPS.length})</option>
              {DEFAULT_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '320px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search code, church, group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.82rem', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE CARD */}
      <div className="account-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', background: '#ffffff', border: '1px solid var(--color-card-border-public)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '14px 18px' }}>Account & Church Name</th>
                <th style={{ padding: '14px 14px' }}>Code / Identifier</th>
                <th style={{ padding: '14px 14px' }}>Group Hierarchy</th>
                <th style={{ padding: '14px 14px' }}>Role</th>
                <th style={{ padding: '14px 14px' }}>Login Status</th>
                <th style={{ padding: '14px 14px' }}>First Login (WAT)</th>
                <th style={{ padding: '14px 14px' }}>Last Active</th>
                <th style={{ padding: '14px 14px', textAlign: 'center' }}>Total Logins</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Souls Won</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'inline-flex', padding: '12px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '8px' }}>
                      <Users size={24} style={{ color: '#64748b' }} />
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No accounts matched your criteria</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Try clearing the search query or adjusting your filter</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => (
                  <tr
                    key={acc.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: acc.hasLoggedIn ? 'rgba(0, 135, 81, 0.02)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = acc.hasLoggedIn ? 'rgba(0, 135, 81, 0.02)' : 'transparent')}
                  >
                    {/* Account Name */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: acc.hasLoggedIn ? '#008751' : '#e2e8f0',
                            color: acc.hasLoggedIn ? '#ffffff' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {(acc.churchName || acc.accountName).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontWeight: 800, color: '#0f172a', display: 'block' }}>
                            {acc.churchName || acc.accountName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {acc.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Church Code */}
                    <td style={{ padding: '14px 14px' }}>
                      {acc.churchCode ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', color: '#0f172a' }}>
                          {acc.churchCode}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* Group */}
                    <td style={{ padding: '14px 14px', color: '#334155', fontWeight: 600 }}>
                      {acc.groupName || 'Abuja Zone 1'}
                    </td>

                    {/* Role */}
                    <td style={{ padding: '14px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: acc.role === 'superAdmin' ? '#fef3c7' : acc.role === 'groupManager' ? '#e0e7ff' : '#f0fdf4',
                          color: acc.role === 'superAdmin' ? '#92400e' : acc.role === 'groupManager' ? '#3730a3' : '#166534',
                          border: `1px solid ${acc.role === 'superAdmin' ? '#fde68a' : acc.role === 'groupManager' ? '#c7d2fe' : '#bbf7d0'}`,
                        }}
                      >
                        {acc.role === 'churchManager'
                          ? 'Church Rep'
                          : acc.role === 'groupManager'
                          ? 'Group Coord'
                          : acc.role === 'superAdmin'
                          ? 'Super Admin'
                          : acc.role === 'zoneManager'
                          ? 'Zonal Leader'
                          : acc.role}
                      </span>
                    </td>

                    {/* Login Status */}
                    <td style={{ padding: '14px 14px' }}>
                      {acc.hasLoggedIn ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: 'rgba(0, 135, 81, 0.1)',
                            border: '1px solid rgba(0, 135, 81, 0.3)',
                            color: '#008751',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>LOGGED IN</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            color: '#b45309',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          <Clock size={13} />
                          <span>PENDING</span>
                        </span>
                      )}
                    </td>

                    {/* First Login */}
                    <td style={{ padding: '14px 14px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(acc.firstLoginAt)}
                    </td>

                    {/* Last Login */}
                    <td style={{ padding: '14px 14px', color: '#0f172a', fontWeight: acc.hasLoggedIn ? 700 : 400, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(acc.lastLoginAt)}
                    </td>

                    {/* Login Count */}
                    <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: acc.loginCount > 0 ? '#008751' : '#94a3b8',
                          background: acc.loginCount > 0 ? 'rgba(0, 135, 81, 0.08)' : 'transparent',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {acc.loginCount || 0}
                      </span>
                    </td>

                    {/* Souls Won */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: acc.soulsSubmitted && acc.soulsSubmitted > 0 ? '#0f172a' : '#94a3b8',
                        }}
                      >
                        {acc.soulsSubmitted ? acc.soulsSubmitted.toLocaleString() : '0'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div style={{ padding: '12px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
          <span>
            Showing <strong>{filteredAccounts.length}</strong> of <strong>{allAccounts.length}</strong> total accounts
          </span>
          <span>
            Real-time audit synchronized with Firebase Auth & Cloud Firestore
          </span>
        </div>
      </div>
    </div>
  );
};
