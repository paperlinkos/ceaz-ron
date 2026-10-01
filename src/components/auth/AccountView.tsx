import React, { useEffect, useState } from 'react';
import { User, Phone, LogOut, Shield, CheckCircle2, Building2, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_CHURCHES, DEFAULT_GROUPS, getGroups, getChurches } from '../../services/organizationService';
import { getAllAccountsWithLoginStatus, type AccountLoginSummary } from '../../services/loginTrackerService';

interface AccountViewProps {
  onOpenAuth: () => void;
  onNavigate?: (tab: any) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onOpenAuth, onNavigate }) => {
  const {
    userProfile,
    soulWinnerProfile,
    isAuthenticated,
    role,
    isRoleVerified,
    logout,
  } = useAuth();

  const isSuperAdmin = role === 'superAdmin' && isRoleVerified;

  const [counts, setCounts] = useState({
    groups: 24,
    churches: 129,
  });

  const [loginSummary, setLoginSummary] = useState<AccountLoginSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getGroups(), getChurches()])
      .then(([gList, cList]) => {
        if (isMounted) {
          const activeG = gList.filter((g) => g.status === 'active').length;
          const activeC = cList.filter((c) => c.status === 'active').length;
          setCounts({
            groups: Math.max(activeG, DEFAULT_GROUPS.length, 24),
            churches: Math.max(activeC, DEFAULT_CHURCHES.length, 129),
          });
        }
      })
      .catch(() => {});

    if (isSuperAdmin) {
      getAllAccountsWithLoginStatus()
        .then((res) => {
          if (isMounted) setLoginSummary(res.summary);
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin]);

  if (!isAuthenticated || !userProfile) {
    return (
      <div className="account-card empty-card">
        <div className="account-avatar-placeholder">
          <User size={32} />
        </div>
        <h3 className="account-title">Campaign Identity</h3>
        <p className="account-lead">
          Sign in with your Church Code or Coordinator credentials to access uploads, targets, and monitoring.
        </p>
        <div className="account-actions">
          <button onClick={() => onOpenAuth()} className="submit-button">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const getRoleLabel = (roleStr?: string) => {
    switch (roleStr) {
      case 'superAdmin':
        return 'Zonal Super Admin';
      case 'zoneManager':
        return 'Abuja Zone 1 Leader';
      case 'groupManager':
        return 'Group Coordinator';
      case 'churchManager':
        return 'Church Representative';
      default:
        return 'Campaign Leader';
    }
  };

  const churchesInGroup = DEFAULT_CHURCHES.filter(
    (c) => c.groupId === soulWinnerProfile?.groupId
  );

  return (
    <div className="account-card" style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
      <div className="account-header-row">
        <div className="account-avatar">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
        <div className="account-title-group">
          <h3 className="account-name">{userProfile.name}</h3>
          <span className="account-email">{userProfile.email}</span>
        </div>
        <button onClick={() => logout()} className="logout-button" title="Sign Out">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

      {/* STATUS BADGES & BANNERS */}
      {userProfile.status === 'active' && (
        <div className="banner banner-success" role="status" style={{ marginTop: '16px' }}>
          <CheckCircle2 size={18} />
          <div>
            <strong>Status: {getRoleLabel(userProfile.role)}</strong>
          </div>
        </div>
      )}

      {(userProfile.status === 'suspended' || userProfile.status === 'disabled') && (
        <div className="banner banner-error" role="status" style={{ marginTop: '16px' }}>
          <AlertTriangle size={18} />
          <div>
            <strong>Status: Account {userProfile.status}</strong>
            <p className="banner-subtext">Access is currently restricted for this account.</p>
          </div>
        </div>
      )}

      {/* USER DETAILS */}
      <div className="account-details-grid" style={{ marginTop: '16px' }}>
        <div className="detail-item">
          <Phone size={14} className="detail-icon" />
          <div>
            <span className="detail-label">Phone</span>
            <span className="detail-value">{userProfile.phone || 'Configured via Representative'}</span>
          </div>
        </div>

        <div className="detail-item">
          <Shield size={14} className="detail-icon" />
          <div>
            <span className="detail-label">Account Role</span>
            <span className="detail-value">{getRoleLabel(userProfile.role)}</span>
          </div>
        </div>
      </div>

      {/* ORGANIZATIONAL HIERARCHY READOUT */}
      <div className="hierarchy-section" style={{ marginTop: '20px' }}>
        <h4 className="hierarchy-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={16} />
          <span>Campaign Jurisdiction & Hierarchy</span>
        </h4>

        <div className="hierarchy-tree">
          <div className="hierarchy-node">
            <span className="node-label">ZONE:</span>
            <span className="node-value">Abuja Zone 1</span>
          </div>

          {/* GROUP MANAGER HIERARCHY */}
          {userProfile.role === 'groupManager' && (
            <>
              <div className="hierarchy-node node-highlight">
                <span className="node-label">ASSIGNED GROUP:</span>
                <span className="node-value">{soulWinnerProfile?.groupName || 'Assigned Group'}</span>
              </div>
              <div className="hierarchy-node">
                <span className="node-label">JURISDICTION:</span>
                <span className="node-value">
                  All Churches under {soulWinnerProfile?.groupName || 'this Group'} ({churchesInGroup.length} Churches)
                </span>
              </div>
            </>
          )}

          {/* CHURCH MANAGER HIERARCHY */}
          {userProfile.role === 'churchManager' && (
            <>
              <div className="hierarchy-node">
                <span className="node-label">PARENT GROUP:</span>
                <span className="node-value">{soulWinnerProfile?.groupName || 'Parent Group'}</span>
              </div>
              <div className="hierarchy-node node-highlight">
                <span className="node-label">ASSIGNED CHURCH:</span>
                <span className="node-value">{soulWinnerProfile?.churchName || 'Designated Church'}</span>
              </div>
            </>
          )}

          {/* ZONAL LEADER & SUPER ADMIN HIERARCHY */}
          {userProfile.role !== 'groupManager' && userProfile.role !== 'churchManager' && (
            <div className="hierarchy-node node-highlight">
              <span className="node-label">JURISDICTION:</span>
              <span className="node-value">All {counts.groups} Groups & {counts.churches} Churches in Abuja Zone 1</span>
            </div>
          )}
        </div>
      </div>

      {/* SUPER ADMIN EXCLUSIVE: ACCOUNT LOGIN TRACKER */}
      {isSuperAdmin && (
        <div
          className="account-superadmin-tracker-card"
          style={{
            marginTop: '24px',
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.08) 0%, rgba(0, 70, 42, 0.14) 100%)',
            border: '1.5px solid rgba(0, 135, 81, 0.35)',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0, 135, 81, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#008751', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                <ShieldCheck size={14} />
                <span>SUPER ADMIN ACCESS CONTROL</span>
              </div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Account Login & Access Tracker
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b', maxWidth: '480px' }}>
                Live audit of all CEAZ1 church representatives and group coordinators that have logged into the platform at least once.
              </p>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('loginTracker')}
                className="submit-button"
                style={{ padding: '10px 18px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>OPEN FULL TRACKER PAGE</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Quick Metrics Strip */}
          {loginSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '16px' }}>
              <div style={{ background: '#ffffff', border: '1px solid rgba(0, 135, 81, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>LOGGED IN</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#008751', marginTop: '2px' }}>
                  {loginSummary.loggedInCount} Active
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>CHURCHES</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {loginSummary.churchAccountsLoggedIn} / {loginSummary.churchAccountsTotal}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>GROUPS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {loginSummary.groupAccountsLoggedIn} / {loginSummary.groupAccountsTotal}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 12px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>PENDING FIRST LOGIN</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>
                  {loginSummary.neverLoggedInCount}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
