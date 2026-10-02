import React, { useState } from 'react';
import {
  Home,
  HeartHandshake,
  User,
  Building,
  Trophy,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  WifiOff,
  Activity,
  Database,
  FolderTree,
  X,
  MapPin,
  ShieldCheck,
  Swords,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import type { TabType } from './Navigation';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAuth: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuth,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const { isAuthenticated, userProfile, isPendingAssignment, role, isRoleVerified, logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const isObserverMode = !isAuthenticated || !role;
  const isSuperAdmin = role === 'superAdmin' && isRoleVerified;

  const toggleSidebar = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const handleItemClick = (tab: TabType) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleAuthClick = () => {
    onOpenAuth();
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogoutClick = () => {
    logout();
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'mobile-drawer-open' : ''}`}>
        {/* Sidebar Header / Brand */}
        <div className="sidebar-header">
          {(!isCollapsed || isMobileOpen) && (
            <div className="sidebar-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/reachout_world_nigeria_logo.png"
                  alt="ReachOut Logo"
                  style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                />
                <div>
                  <h1 className="sidebar-title">CEAZ1 REACHOUT</h1>
                  <p className="sidebar-subtitle">SOUL WINNING CAMPAIGN</p>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-btn desktop-only-btn"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile Drawer Close Button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="sidebar-toggle-btn mobile-close-btn"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X size={20} />
            </button>
          )}
        </div>


      {/* Network Status (Offline only) */}
      {!isCollapsed && !isOnline && (
        <div className="sidebar-status-box">
          <div className="status-badge status-offline">
            <WifiOff size={13} />
            <span>OFFLINE</span>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {/* 1. Home & Counter Tab */}
        <button
          onClick={() => handleItemClick('home')}
          className={`sidebar-link ${activeTab === 'home' ? 'sidebar-link-active' : ''}`}
          title="Home - Event Counter"
        >
          <Home size={20} />
          {(!isCollapsed || isMobileOpen) && <span>HOME & COUNTER</span>}
        </button>

        {/* 2. Upward Race Tab (Visible in Observer Mode and Non-SoulWinner roles) */}
        {(isObserverMode || role !== 'soulWinner') && (
          <button
            onClick={() => handleItemClick('race')}
            className={`sidebar-link ${activeTab === 'race' ? 'sidebar-link-active' : ''}`}
            title="Upward Race"
          >
            <Trophy size={20} />
            {(!isCollapsed || isMobileOpen) && <span>UPWARD RACE</span>}
          </button>
        )}

        {/* 3. PCF Arena Head-to-Head (Dedicated Standalone Page) */}
        {(isObserverMode || role !== 'soulWinner') && (
          <button
            onClick={() => handleItemClick('pcfArena')}
            className={`sidebar-link ${activeTab === 'pcfArena' ? 'sidebar-link-active' : ''}`}
            title="PCF Arena Head-to-Head"
          >
            <Swords size={20} />
            {(!isCollapsed || isMobileOpen) && <span>PCF ARENA</span>}
          </button>
        )}

        {/* 3. Abuja Harvest Map (Strictly in Observer View ONLY) */}
        {isObserverMode && (
          <button
            onClick={() => handleItemClick('map')}
            className={`sidebar-link ${activeTab === 'map' ? 'sidebar-link-active' : ''}`}
            title="Abuja Church Harvest Map (Realtime Church Locations & Progress)"
          >
            <MapPin size={20} />
            {(!isCollapsed || isMobileOpen) && <span>ABUJA MAP</span>}
          </button>
        )}

        {/* The remaining tabs are strictly for Authenticated Users */}
        {isAuthenticated && (
          <>
            <button
              onClick={() => handleItemClick('record')}
              className={`sidebar-link ${activeTab === 'record' ? 'sidebar-link-active' : ''}`}
              title="Record a Soul"
            >
              <HeartHandshake size={20} />
              {(!isCollapsed || isMobileOpen) && (
                <span>{role && role !== 'soulWinner' ? 'SOUL ENTRY & UPLOAD' : 'RECORD SOUL'}</span>
              )}
            </button>

            <button
              onClick={() => handleItemClick('dashboard')}
              className={`sidebar-link ${activeTab === 'dashboard' ? 'sidebar-link-active' : ''}`}
              title="Monitoring Dashboard"
            >
              <Building size={20} />
              {(!isCollapsed || isMobileOpen) && (
                <span>
                  {role === 'zoneManager'
                    ? 'MY ZONE'
                    : role === 'groupManager'
                    ? 'MY GROUP'
                    : role === 'churchManager'
                    ? 'MY CHURCH'
                    : role === 'superAdmin'
                    ? 'ALL DASHBOARDS'
                    : 'MY PROGRESS'}
                </span>
              )}
            </button>

            {/* Directory accessible to Super Admin, Zonal Admin, Group Manager, Church Manager */}
            {(isSuperAdmin || role === 'zoneManager' || role === 'groupManager' || role === 'churchManager') && (
              <button
                onClick={() => handleItemClick('directory')}
                className={`sidebar-link ${activeTab === 'directory' ? 'sidebar-link-active' : ''}`}
                title="Directory & Reports"
              >
                <FolderTree size={20} />
                {(!isCollapsed || isMobileOpen) && <span>DIRECTORY & DATA</span>}
              </button>
            )}

            {isSuperAdmin && (
              <>
                <button
                  onClick={() => handleItemClick('eventControl')}
                  className={`sidebar-link ${activeTab === 'eventControl' ? 'sidebar-link-active' : ''}`}
                  title="Event Control & Command Center"
                >
                  <Activity size={20} />
                  {(!isCollapsed || isMobileOpen) && <span>EVENT CONTROL</span>}
                </button>

                <button
                  onClick={() => handleItemClick('org')}
                  className={`sidebar-link ${activeTab === 'org' ? 'sidebar-link-active' : ''}`}
                  title="Organization Management"
                >
                  <Building size={20} />
                  {(!isCollapsed || isMobileOpen) && <span>ORGANIZATION</span>}
                </button>

                <button
                  onClick={() => handleItemClick('importData')}
                  className={`sidebar-link ${activeTab === 'importData' ? 'sidebar-link-active' : ''}`}
                  title="Bulk Data Import"
                >
                  <Database size={20} />
                  {(!isCollapsed || isMobileOpen) && <span>IMPORT DATA</span>}
                </button>

                <button
                  onClick={() => handleItemClick('loginTracker')}
                  className={`sidebar-link ${activeTab === 'loginTracker' ? 'sidebar-link-active' : ''}`}
                  title="Account Login & Access Tracker"
                >
                  <ShieldCheck size={20} />
                  {(!isCollapsed || isMobileOpen) && <span>LOGIN TRACKER</span>}
                </button>
              </>
            )}

            <button
              onClick={() => handleItemClick('account')}
              className={`sidebar-link ${activeTab === 'account' ? 'sidebar-link-active' : ''}`}
              title="My Account"
            >
              <div className="nav-tab-icon-wrapper">
                <User size={20} />
                {isPendingAssignment && (
                  <span className="indicator-dot" title="Pending assignment" />
                )}
              </div>
              {(!isCollapsed || isMobileOpen) && <span>MY ACCOUNT</span>}
            </button>
          </>
        )}
      </nav>

      {/* PWA Offline App Install Box in Sidebar */}
      <PwaInstallPrompt isCollapsed={isCollapsed && !isMobileOpen} />

      {/* Sidebar Footer / User Account Section */}
      <div className="sidebar-footer">
        {isAuthenticated && userProfile ? (
          <div className="sidebar-user-card">
            <div className="user-avatar">{userProfile.name.charAt(0).toUpperCase()}</div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="user-info">
                <span className="user-name">{userProfile.name}</span>
                <span className="user-role">{userProfile.role}</span>
              </div>
            )}
            {(!isCollapsed || isMobileOpen) && (
              <button onClick={handleLogoutClick} className="user-logout-btn" title="Sign Out">
                <LogOut size={16} />
              </button>
            )}
          </div>
        ) : (
          (!isCollapsed || isMobileOpen) && (
            <div className="sidebar-guest-card">
              <span className="guest-hint">Record souls under your account</span>
              <div className="sidebar-auth-btns">
                <button onClick={handleAuthClick} className="btn-green-accent btn-sm">
                  <LogIn size={14} />
                  <span>Sign In with Code</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </aside>
    </>

  );
};
