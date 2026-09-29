import React, { useState, useEffect } from 'react';
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
  getPCFs,
  resolvePCFHierarchy,
} from '../../services/organizationService';
import type { UserProfile, SoulWinnerProfile, AccountStatus, UserRole } from '../../types/auth';
import type { Zone, Group, Church, PCF } from '../../types/organization';

export const UserManagementView: React.FC = () => {
  const { userProfile: currentUser, role } = useAuth();
  const isSuperAdmin = role === 'superAdmin';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [swProfiles, setSwProfiles] = useState<SoulWinnerProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [pcfs, setPcfs] = useState<PCF[]>([]);

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
  const [selPcfId, setSelPcfId] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const refreshUsersAndOrgs = async () => {
    setIsLoading(true);
    try {
      const [uList, swList, zList, gList, cList, pList] = await Promise.all([
        getAllUsers(),
        getAllSoulWinnerProfiles(),
        getZones(),
        getGroups(),
        getChurches(),
        getPCFs(),
      ]);
      setUsers(uList);
      setSwProfiles(swList);
      setZones(zList);
      setGroups(gList);
      setChurches(cList);
      setPcfs(pList);
      setChurchAccounts(getChurchAccounts());
    } catch (err) {
      console.warn('Error fetching users and orgs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUsersAndOrgs();
  }, []);

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
      } else if (actionModal.type === 'reassign' && selPcfId) {
        const { pcf, church, group, zone } = await resolvePCFHierarchy(selPcfId);
        await assignSoulWinnerHierarchy(
          actionModal.user.id,
          {
            pcfId: pcf.id,
            churchId: church.id,
            groupId: group.id,
            zoneId: zone.id,
            pcfName: pcf.name,
            churchName: church.name,
            groupName: group.name,
            zoneName: zone.name,
          },
          actorId
        );
        setSuccess(
          `Reassigned ${actionModal.user.name} to ${pcf.name} (${church.name}, ${group.name}, ${zone.name}). Future records will use this assignment; historical records remain preserved.`
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
  const availablePcfs = pcfs.filter((p) => p.churchId === selChurchId);

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
              {churchAccounts.length}
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
                <span>Abuja Zone 1: Church Representative Accounts ({churchAccounts.length} Churches)</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                1 account designated per church. Each Church Code serves as their login username.
              </p>
            </div>
          </div>

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
                setChurchAccounts(getChurchAccounts());
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
                </tr>
              </thead>
              <tbody>
                {churchAccounts
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
                            background: acc.status === 'activated' ? 'rgba(0, 135, 81, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                            color: acc.status === 'activated' ? '#008751' : '#b45309',
                          }}
                        >
                          {acc.status === 'activated' ? 'ACTIVATED' : 'PENDING ACTIVATION'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {acc.representative ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{acc.representative.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{acc.representative.email} • {acc.representative.phone}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending 1st sign-in</span>
                        )}
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
                      {sw?.pcfName ? (
                        `${sw.pcfName} • ${sw.churchName || ''} • ${sw.groupName || ''} • ${sw.zoneName || ''}`
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
                      setSelPcfId(sw?.pcfId || '');
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
                    <option value="pcfLeader">Role: PCF Leader</option>
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
                      setSelPcfId('');
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
                      setSelPcfId('');
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
                      setSelPcfId('');
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

                <div className="form-group">
                  <label className="form-label text-xs">4. Select PCF *</label>
                  <select
                    value={selPcfId}
                    onChange={(e) => setSelPcfId(e.target.value)}
                    disabled={!selChurchId}
                    className="form-input select-sm"
                  >
                    <option value="">-- Select PCF --</option>
                    {availablePcfs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
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
                disabled={isProcessing || (actionModal.type === 'reassign' && !selPcfId)}
                className="submit-button"
              >
                {isProcessing ? 'PROCESSING...' : 'CONFIRM ACTION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
