import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Menu, LogIn, User } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../context/AuthContext';
import { isSyncActive } from '../services/syncService';

interface HeaderProps {
  pendingCount: number;
  syncedCount: number;
  onManualSync: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pendingCount,
  syncedCount,
  onManualSync,
  onOpenMobileDrawer,
  onOpenAuth,
}) => {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated, userProfile, isPendingAssignment } = useAuth();
  const syncing = isSyncActive();

  return (
    <header className="header-container">
      {/* Left: Mobile Hamburger Button */}
      {onOpenMobileDrawer && (
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="mobile-hamburger-btn"
          aria-label="Open Navigation Drawer"
          title="Open Menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Brand Title */}
      <div className="header-brand">
        <h1 className="header-title">CEAZ1 REACHOUT NIGERIA</h1>
        <p className="header-subtitle">SOUL WINNING CAMPAIGN</p>
      </div>

      {/* Right: Actions, Sync, and Mobile Sign In / User Status */}
      <div className="header-actions">
        {!isOnline && (
          <div className="status-badge status-offline" title="Offline mode active">
            <WifiOff size={14} />
            <span className="hide-on-compact">OFFLINE</span>
          </div>
        )}

        {pendingCount > 0 && isOnline && (
          <button
            onClick={onManualSync}
            disabled={syncing}
            className="sync-button"
            title="Sync pending records to cloud"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'SYNCING...' : `SYNC (${pendingCount})`}</span>
          </button>
        )}

        {pendingCount === 0 && syncedCount > 0 && isOnline && (
          <div className="status-badge status-synced-all">
            <CheckCircle2 size={14} />
            <span className="hide-on-compact">SYNCED</span>
          </div>
        )}

        {/* Mobile Sign In button (when unauthenticated) */}
        {!isAuthenticated && onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="header-signin-btn"
            title="Sign in with Church Code"
          >
            <LogIn size={15} />
            <span>SIGN IN</span>
          </button>
        )}

        {/* Mobile Authenticated User Avatar Pill */}
        {isAuthenticated && userProfile && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="header-user-pill"
            title={`${userProfile.name} (${userProfile.role})`}
          >
            <div className="header-user-avatar">
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : <User size={13} />}
              {isPendingAssignment && <span className="header-avatar-badge" />}
            </div>
            <span className="header-user-name hide-on-compact">{userProfile.name.split(' ')[0]}</span>
          </button>
        )}
      </div>
    </header>
  );
};

