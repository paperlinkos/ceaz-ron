import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getChurchAccounts,
  createChurchAccount,
  batchCreateChurchAccounts,
  resetChurchAccountPassword,
  exportChurchAccountsToExcelCSV,
  exportCredentialsCSV,
  churchCodeToAuthEmail,
  type ChurchAccount,
} from '../../services/churchAccountService';
import {
  getAllUsers,
  getAllSoulWinnerProfiles,
  updateUserStatus,
  updateUserRole,
  assignSoulWinnerHierarchy,
} from '../../services/userService';
import {
  getZones,
  getGroups,
  getChurches,
} from '../../services/organizationService';
import { getOfficialTarget } from '../../services/targetService';
import type { UserProfile, SoulWinnerProfile, AccountStatus, UserRole } from '../../types/auth';
import type { Zone, Group, Church } from '../../types/organization';

export const UserManagementView: React.FC = () => {
  const { userProfile: currentUser, role } = useAuth();
  const isSuperAdmin = role === 'superAdmin';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [swProfiles, setSwProfiles] = useState<SoulWinnerProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [managementTab, setManagementTab] = useState<'church_reps' | 'users'>('church_reps');
  const [churchAccounts, setChurchAccounts] = useState<ChurchAccount[]>([]);

  // Confirmation Modals State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'status' | 'role' | 'reassign' | null;
    user: UserProfile | null;
    newStatus?: AccountStatus;
    newRole?: UserRole;
  }>({ isOpen: false, type: null, user: null });

  // Reassignment selection states
  const [selZoneId, setSelZoneId] = useState<string>('');
  const [selGroupId, setSelGroupId] = useState<string>('');
  const [selChurchId, setSelChurchId] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Church account provisioning: admins create real Firebase Auth accounts
  // and hand out the credentials. Passwords are shown exactly once.
  const [showCreateAccount, setShowCreateAccount] = useState<boolean>(false);
  const [draftChurchId, setDraftChurchId] = useState<string>('');
  const [draftRepName, setDraftRepName] = useState<string>('');
  const [draftRepEmail, setDraftRepEmail] = useState<string>('');
  const [draftRepPhone, setDraftRepPhone] = useState<string>('');
  const [issuedCredentials, setIssuedCredentials] = useState<{
    churchCode: string;
    password: string;
    churchName: string;
  } | null>(null);

  const refreshUsersAndOrgs = async () => {
    setIsLoading(true);
    try {
      const [uList, swList, zList, gList, cList] = await Promise.all([
        getAllUsers(),
        getAllSoulWinnerProfiles(),
        getZones(),
        getGroups(),
        getChurches(),
      ]);
      setUsers(uList);
      setSwProfiles(swList);
      setZones(zList);
      setGroups(gList);
      setChurches(cList);
      setChurchAccounts(await getChurchAccounts());
    } catch (err) {
      console.warn('Error fetching users and orgs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Full roster of 127 churches: merge any Firestore accounts with our official roster
  const displayedChurchAccounts = useMemo<ChurchAccount[]>(() => {
    const accMapByCode = new Map(churchAccounts.map((a) => [a.churchCode.toUpperCase(), a]));
    const accMapByChurchId = new Map(churchAccounts.map((a) => [a.churchId, a]));

    return churches.map((c) => {
      const existing = accMapByCode.get(c.code.toUpperCase()) || accMapByChurchId.get(c.id);
      if (existing) return existing;
      const group = groups.find((g) => g.id === c.groupId);
      return {
        churchId: c.id,
        churchName: c.name,
        churchCode: c.code,
        uid: '',
        loginEmail: churchCodeToAuthEmail(c.code),
        groupId: c.groupId,
        groupName: group?.name || '',
        targetSouls: getOfficialTarget('church', c.id) || 0,
        status: 'active' as const,
        representative: undefined,
        createdAt: '',
        updatedAt: '',
      };
    });
  }, [churches, churchAccounts, groups]);

  useEffect(() => {
    refreshUsersAndOrgs();
  }, []);

  const handleCreateAccount = async () => {
    setError('');
    setSuccess('');
    const church = churches.find((c) => c.id === draftChurchId);
    if (!church) {
      setError('Please select a church.');
      return;
    }
    if (!draftRepName.trim()) {
      setError('Please enter the representative full name.');
      return;
    }

    setIsProcessing(true);
    try {
      const group = groups.find((g) => g.id === church.groupId);
      const result = await createChurchAccount({
        churchId: church.id,
        churchName: church.name,
        churchCode: church.code,
        groupId: church.groupId,
        groupName: group?.name || '',
        targetSouls: 0,
        repName: draftRepName.trim(),
        repEmail: draftRepEmail.trim(),
        repPhone: draftRepPhone.trim(),
      });

      setIssuedCredentials({
        churchCode: result.credentials.churchCode,
        password: result.credentials.password,
        churchName: church.name,
      });
      setShowCreateAccount(false);
      setDraftChurchId('');
      setDraftRepName('');
      setDraftRepEmail('');
      setDraftRepPhone('');
      setSuccess(`Account created for ${church.name}. Copy the password now — it is not shown again.`);
      await refreshUsersAndOrgs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchProvision = async () => {
    setError('');
    setSuccess('');
    setIsProcessing(true);

    try {
      const payload = churches.map((c) => {
        const group = groups.find((g) => g.id === c.groupId);
        return {
          churchId: c.id,
          churchName: c.name,
          churchCode: c.code,
          groupId: c.groupId,
          groupName: group?.name || '',
          targetSouls: getOfficialTarget('church', c.id) || 0,
        };
      });

      const res = await batchCreateChurchAccounts(payload);
      if (res.credentials && res.credentials.length > 0) {
        exportCredentialsCSV(res.credentials);
        setSuccess(`Successfully provisioned ${res.credentials.length} missing church account(s) and downloaded their initial credentials CSV!`);
      } else {
        setSuccess('All churches in the roster already have active accounts.');
      }
      await refreshUsersAndOrgs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch provisioning failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async (acc: ChurchAccount) => {
    setError('');
    setSuccess('');
    setIsProcessing(true);
    try {
      const result = await resetChurchAccountPassword(acc.churchCode);
      setIssuedCredentials({
        churchCode: result.credentials.churchCode,
        password: result.credentials.password,
        churchName: acc.churchName,
      });
      setSuccess(`Password reset for ${acc.churchName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="account-card empty-card">
        <ShieldAlert size={36} className="text-error" />
        <h3 className="account-title">Access Restricted</h3>
        <p className="account-lead">User management is restricted to authorized Super Administrators.</p>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSwAssignment = (userId: string) => {
    return swProfiles.find((sw) => sw.userId === userId);
  };

  const handleExecuteAction = async () => {
    if (!actionModal.user || !actionModal.type) return;
    setIsProcessing(true);
    setError('');
    setSuccess('');

    const actorId = currentUser?.id || 'superAdmin';

    try {
      if (actionModal.type === 'status' && actionModal.newStatus) {
        await updateUserStatus(actionModal.user.id, actionModal.newStatus, actorId);
        setSuccess(`Updated account status for ${actionModal.user.name} to ${actionModal.newStatus}.`);
      } else if (actionModal.type === 'role' && actionModal.newRole) {
        await updateUserRole(actionModal.user.id, actionModal.newRole, actorId);
        setSuccess(`Changed role for ${actionModal.user.name} to ${actionModal.newRole}.`);
      } else if (actionModal.type === 'reassign' && selChurchId) {
        const church = churches.find((c) => c.id === selChurchId);
        const group = groups.find((g) => g.id === church?.groupId);
        const zone = zones[0] || { id: 'zone-abuja-1', name: 'Abuja Zone 1' };
        if (!church || !group) {
          throw new Error('Please select a valid church.');
        }
        await assignSoulWinnerHierarchy(
          actionModal.user.id,
          {
            churchId: church.id,
            groupId: group.id,
            zoneId: zone.id,
            churchName: church.name,
            groupName: group.name,
            zoneName: zone.name,
          },
          actorId
        );
        setSuccess(
          `Reassigned ${actionModal.user.name} to ${church.name} (${group.name}, ${zone.name}). Future records will use this assignment; historical records remain preserved.`
        );
      }

      setActionModal({ isOpen: false, type: null, user: null });
      await refreshUsersAndOrgs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const availableGroups = groups.filter((g) => g.zoneId === selZoneId);
  const availableChurches = churches.filter((c) => c.groupId === selGroupId);

  return (
    <div className="account-card">
      <div className="form-header">
        <h2 className="form-title">
          <Users size={24} className="inline-icon" /> User & Role Management
        </h2>
        <p className="form-lead">
          Manage Church Representative accounts, individual roles, and download credentials spreadsheet.
        </p>

        {/* SUBTABS: CHURCH REPRESENTATIVES VS INDIVIDUAL PROFILES */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => setManagementTab('church_reps')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: managementTab === 'church_reps' ? '1.5px solid #008751' : '1px solid #cbd5e1',
              background: managementTab === 'church_reps' ? '#008751' : '#ffffff',
              color: managementTab === 'church_reps' ? '#ffffff' : '#475569',
              boxShadow: managementTab === 'church_reps' ? '0 4px 14px rgba(0, 135, 81, 0.25)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Building size={16} />
            <span>Church Accounts (Excel Export)</span>
            <span
              style={{
                background: managementTab === 'church_reps' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: managementTab === 'church_reps' ? '#ffffff' : '#334155',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {Math.max(displayedChurchAccounts.length, churches.length, 127)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setManagementTab('users')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: managementTab === 'users' ? '1.5px solid #008751' : '1px solid #cbd5e1',
              background: managementTab === 'users' ? '#008751' : '#ffffff',
              color: managementTab === 'users' ? '#ffffff' : '#475569',
              boxShadow: managementTab === 'users' ? '0 4px 14px rgba(0, 135, 81, 0.25)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Users size={16} />
            <span>Legacy User Profiles</span>
            <span
              style={{
                background: managementTab === 'users' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: managementTab === 'users' ? '#ffffff' : '#334155',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.72rem',
              }}
            >
              {users.length}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-box">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* VIEW 1: CHURCH REPRESENTATIVE ACCOUNTS WITH EXCEL EXPORT */}
      {managementTab === 'church_reps' && (
        <div style={{ marginTop: '10px' }}>
          {/* EXCEL EXPORT HERO CARD */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.08) 0%, rgba(0, 135, 81, 0.02) 100%)',
              border: '1.5px solid rgba(0, 135, 81, 0.25)',
              borderRadius: '16px',
              padding: '18px 24px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.1rem', color: '#008751' }}>
                <Building size={22} />
                <span>Abuja Zone 1: Church Representative Accounts ({Math.max(displayedChurchAccounts.length, churches.length, 127)} Churches)</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                1 account designated per church. Each Church Code serves as their login username.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleBatchProvision}
                disabled={isProcessing}
                className="submit-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0, backgroundColor: '#059669' }}
              >
                <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
                Provision All Accounts
              </button>
              <button
                onClick={() => setShowCreateAccount(true)}
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0 }}
              >
                <UserCheck size={18} />
                Create Single
              </button>
              <button
                onClick={() => exportChurchAccountsToExcelCSV(displayedChurchAccounts)}
                disabled={displayedChurchAccounts.length === 0}
                className="secondary-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0 }}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* ONE-TIME CREDENTIALS REVEAL — passwords are never stored or re-shown */}
          {issuedCredentials && (
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '16px',
                padding: '18px 24px',
                marginBottom: '20px',
                color: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>
                    {issuedCredentials.churchName} — hand these over now
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    This password is shown once and is not stored anywhere. Write it down or print
                    the sheet before closing.
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.08em' }}>USERNAME</div>
                      <code style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4ade80' }}>
                        {issuedCredentials.churchCode}
                      </code>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.08em' }}>PASSWORD</div>
                      <code style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4ade80' }}>
                        {issuedCredentials.password}
                      </code>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIssuedCredentials(null)}
                  className="secondary-button"
                  style={{ margin: 0, whiteSpace: 'nowrap' }}
                >
                  I've recorded it
                </button>
              </div>
            </div>
          )}

          {/* SEARCH BAR FOR CHURCH ACCOUNTS */}
          <div className="user-filter-bar" style={{ marginBottom: '16px' }}>
            <div className="input-wrapper search-wrapper" style={{ flex: 1 }}>
              <Search size={16} className="input-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search church by name, code (e.g. CH-KBS), group..."
                className="form-input search-input"
              />
            </div>
            <button
              onClick={() => {
                refreshUsersAndOrgs();
              }}
              className="icon-button-light"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* CHURCH ACCOUNTS TABLE */}
          <div style={{ overflowX: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '12px 16px' }}>Church Name</th>
                  <th style={{ padding: '12px 16px' }}>Church Code (Username)</th>
                  <th style={{ padding: '12px 16px' }}>Parent Group</th>
                  <th style={{ padding: '12px 16px' }}>Target Souls</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Representative Contact</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedChurchAccounts
                  .filter((acc) => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      acc.churchName.toLowerCase().includes(q) ||
                      acc.churchCode.toLowerCase().includes(q) ||
                      acc.groupName.toLowerCase().includes(q) ||
                      (acc.representative && (
                        acc.representative.name.toLowerCase().includes(q) ||
                        acc.representative.email.toLowerCase().includes(q) ||
                        acc.representative.phone.includes(q)
                      ))
                    );
                  })
                  .map((acc) => (
                    <tr key={acc.churchId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                        {acc.churchName}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, color: '#008751' }}>
                          {acc.churchCode}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {acc.groupName}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#008751' }}>
                        {acc.targetSouls.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: acc.status === 'active' ? 'rgba(0, 135, 81, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                            color: acc.status === 'active' ? '#008751' : '#b45309',
                          }}
                        >
                          {acc.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {acc.representative ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{acc.representative.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{acc.representative.email} • {acc.representative.phone}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No representative set</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleResetPassword(acc)}
                          disabled={isProcessing}
                          className="secondary-button"
                          style={{ margin: 0, padding: '6px 12px', fontSize: '0.74rem' }}
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: LEGACY INDIVIDUAL USER PROFILES */}
      {managementTab === 'users' && (
        <div style={{ marginTop: '10px' }}>
          {/* FILTER & SEARCH BAR */}
          <div className="user-filter-bar">
            <div className="input-wrapper search-wrapper">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="form-input search-input"
              />
            </div>

            <div className="filter-group">
              <label className="form-label text-xs">Status Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input select-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pendingAssignment">Pending Assignment</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <button onClick={refreshUsersAndOrgs} className="icon-button-light" title="Refresh List">
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

      {/* USER LIST GRID */}
      {isLoading ? (
        <p className="loading-text">Loading registered users...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="empty-text">No users found matching current filters.</p>
      ) : (
        <div className="users-list-grid">
          {filteredUsers.map((u) => {
            const sw = getSwAssignment(u.id);

            return (
              <div key={u.id} className="user-management-card">
                <div className="user-card-header">
                  <div className="user-avatar-sm">{u.name.charAt(0).toUpperCase()}</div>
                  <div className="user-main-meta">
                    <h4 className="user-card-name">{u.name}</h4>
                    <span className="user-card-email">{u.email}</span>
                  </div>
                  <span className={`status-pill status-${u.status}`}>
                    {u.status === 'pendingAssignment' ? 'PENDING' : u.status.toUpperCase()}
                  </span>
                </div>

                <div className="user-card-details">
                  <div className="detail-row">
                    <span className="detail-lbl">ROLE:</span>
                    <span className="detail-val role-badge">{u.role}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-lbl">ASSIGNMENT:</span>
                    <span className="detail-val org-path">
                      {sw?.churchName ? (
                        `${sw.churchName} • ${sw.groupName || ''} • ${sw.zoneName || ''}`
                      ) : (
                        <em className="text-dim">Unassigned</em>
                      )}
                    </span>
                  </div>
                </div>

                {/* USER MANAGEMENT ACTIONS */}
                <div className="user-card-actions">
                  <button
                    onClick={() => {
                      setSelZoneId(sw?.zoneId || '');
                      setSelGroupId(sw?.groupId || '');
                      setSelChurchId(sw?.churchId || '');
                      setActionModal({ isOpen: true, type: 'reassign', user: u });
                    }}
                    className="btn-xs btn-outline"
                  >
                    <UserCheck size={14} /> Assign / Reassign
                  </button>

                  <select
                    value={u.role}
                    onChange={(e) =>
                      setActionModal({
                        isOpen: true,
                        type: 'role',
                        user: u,
                        newRole: e.target.value as UserRole,
                      })
                    }
                    className="select-xs"
                  >
                    <option value="soulWinner">Role: Soul Winner</option>
                    <option value="churchManager">Role: Church Manager</option>
                    <option value="groupManager">Role: Group Manager</option>
                    <option value="zoneManager">Role: Zone Manager</option>
                    <option value="superAdmin">Role: Super Admin</option>
                  </select>

                  {u.status === 'active' && (
                    <button
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: 'status',
                          user: u,
                          newStatus: 'suspended',
                        })
                      }
                      className="btn-xs btn-danger-outline"
                    >
                      Suspend
                    </button>
                  )}

                  {u.status === 'suspended' && (
                    <button
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: 'status',
                          user: u,
                          newStatus: 'active',
                        })
                      }
                      className="btn-xs btn-success-outline"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

  {/* CONFIRMATION MODAL */}
      {actionModal.isOpen && actionModal.user && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <AlertTriangle size={36} className="text-warning mx-auto" />
            <h3 className="modal-title text-center">
              {actionModal.type === 'reassign'
                ? 'REASSIGN USER?'
                : actionModal.type === 'role'
                ? 'CHANGE USER ROLE?'
                : `${actionModal.newStatus?.toUpperCase()} USER?`}
            </h3>

            <p className="modal-subtitle text-center">
              Target User: <strong>{actionModal.user.name}</strong> ({actionModal.user.email})
            </p>

            {/* REASSIGNMENT PICKER IF TYPE == REASSIGN */}
            {actionModal.type === 'reassign' && (
              <div className="reassign-picker-form">
                <div className="form-group">
                  <label className="form-label text-xs">1. Select Zone *</label>
                  <select
                    value={selZoneId}
                    onChange={(e) => {
                      setSelZoneId(e.target.value);
                      setSelGroupId('');
                      setSelChurchId('');
                    }}
                    className="form-input select-sm"
                  >
                    <option value="">-- Select Zone --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">2. Select Group *</label>
                  <select
                    value={selGroupId}
                    onChange={(e) => {
                      setSelGroupId(e.target.value);
                      setSelChurchId('');
                    }}
                    disabled={!selZoneId}
                    className="form-input select-sm"
                  >
                    <option value="">-- Select Group --</option>
                    {availableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">3. Select Church *</label>
                  <select
                    value={selChurchId}
                    onChange={(e) => {
                      setSelChurchId(e.target.value);
                    }}
                    disabled={!selGroupId}
                    className="form-input select-sm"
                  >
                    <option value="">-- Select Church --</option>
                    {availableChurches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="historical-notice-box">
                  <strong>CRITICAL RULE:</strong> Future soul submissions will use this new assignment. Historical soul-winning records will remain attributed to their original organization.
                </div>
              </div>
            )}

            <div className="modal-actions-row">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, type: null, user: null })}
                disabled={isProcessing}
                className="secondary-button"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={isProcessing || (actionModal.type === 'reassign' && !selChurchId)}
                className="submit-button"
              >
                {isProcessing ? 'PROCESSING...' : 'CONFIRM ACTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CHURCH REPRESENTATIVE ACCOUNT */}
      {showCreateAccount && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Church Account</h3>
              <p className="modal-subtitle">
                Provisions a real login for this church. The Church Code becomes their username and
                the password is revealed once, after creation.
              </p>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Church</label>
                <select
                  value={draftChurchId}
                  onChange={(e) => setDraftChurchId(e.target.value)}
                  className="form-input"
                  disabled={isProcessing}
                >
                  <option value="">Select a church...</option>
                  {churches.map((c) => {
                    const already = churchAccounts.find((a) => a.churchId === c.id);
                    return (
                      <option key={c.id} value={c.id} disabled={Boolean(already)}>
                        {c.name} ({c.code}){already ? ' — account exists' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Representative Full Name</label>
                <input
                  type="text"
                  value={draftRepName}
                  onChange={(e) => setDraftRepName(e.target.value)}
                  placeholder="e.g. Bro. David Emmanuel"
                  className="form-input"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email (optional)</label>
                <input
                  type="email"
                  value={draftRepEmail}
                  onChange={(e) => setDraftRepEmail(e.target.value)}
                  placeholder="e.g. david.emmanuel@gmail.com"
                  className="form-input"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone (optional)</label>
                <input
                  type="tel"
                  value={draftRepPhone}
                  onChange={(e) => setDraftRepPhone(e.target.value)}
                  placeholder="e.g. 08031234567"
                  className="form-input"
                  disabled={isProcessing}
                />
              </div>

              {draftChurchId && (
                <div
                  style={{
                    background: 'rgba(0, 135, 81, 0.06)',
                    border: '1px solid rgba(0, 135, 81, 0.2)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '0.8rem',
                    color: '#334155',
                  }}
                >
                  The representative will sign in with username{' '}
                  <strong style={{ color: '#008751' }}>
                    {churches.find((c) => c.id === draftChurchId)?.code?.toUpperCase()}
                  </strong>
                  .
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateAccount(false)}
                  disabled={isProcessing}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={isProcessing || !draftChurchId}
                  className="submit-button"
                >
                  {isProcessing ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
