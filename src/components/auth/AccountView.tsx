import React, { useEffect, useState } from 'react';
import { User, Phone, LogOut, Shield, CheckCircle2, Building2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_CHURCHES, DEFAULT_GROUPS, getGroups, getChurches } from '../../services/organizationService';

interface AccountViewProps {
  onOpenAuth: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onOpenAuth }) => {
  const {
    userProfile,
    soulWinnerProfile,
    isAuthenticated,
    logout,
  } = useAuth();

  const [counts, setCounts] = useState({
    groups: DEFAULT_GROUPS.length,
    churches: DEFAULT_CHURCHES.length,
  });

  useEffect(() => {
    let isMounted = true;
    Promise.all([getGroups(), getChurches()])
      .then(([gList, cList]) => {
        if (isMounted) {
          setCounts({
            groups: gList.filter((g) => g.status === 'active').length || DEFAULT_GROUPS.length,
            churches: cList.filter((c) => c.status === 'active').length || DEFAULT_CHURCHES.length,
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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
          {(userProfile.role === 'zoneManager' || userProfile.role === 'superAdmin') && (
            <div className="hierarchy-node node-highlight">
              <span className="node-label">JURISDICTION:</span>
              <span className="node-value">All {counts.groups} Groups & {counts.churches} Churches in Abuja Zone 1</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
