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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { TabType } from './Navigation';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAuth: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuth,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const { isAuthenticated, userProfile, isPendingAssignment, role, logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const isObserverMode = !isAuthenticated || !role;
  const isSuperAdmin = role === 'superAdmin';

  const toggleSidebar = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar Header / Brand */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-brand">
            <h1 className="sidebar-title">CEAZ1 REACHOUT NIGERIA</h1>
            <p className="sidebar-subtitle">SOUL WINNING CAMPAIGN</p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
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
          onClick={() => onSelectTab('home')}
          className={`sidebar-link ${activeTab === 'home' ? 'sidebar-link-active' : ''}`}
          title="Home - Event Counter"
        >
          <Home size={20} />
          {!isCollapsed && <span>HOME & COUNTER</span>}
        </button>

        {/* 2. Upward Race Tab (Visible in Observer Mode and Non-SoulWinner roles) */}
        {(isObserverMode || role !== 'soulWinner') && (
          <button
            onClick={() => onSelectTab('race')}
            className={`sidebar-link ${activeTab === 'race' ? 'sidebar-link-active' : ''}`}
            title="Upward Race"
          >
            <Trophy size={20} />
            {!isCollapsed && <span>UPWARD RACE</span>}
          </button>
        )}

        {/* The remaining tabs are strictly for Authenticated Users */}
        {isAuthenticated && (
          <>
            <button
              onClick={() => onSelectTab('record')}
              className={`sidebar-link ${activeTab === 'record' ? 'sidebar-link-active' : ''}`}
              title="Record a Soul"
            >
              <HeartHandshake size={20} />
              {!isCollapsed && (
                <span>{role && role !== 'soulWinner' ? 'SOUL ENTRY & UPLOAD' : 'RECORD SOUL'}</span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`sidebar-link ${activeTab === 'dashboard' ? 'sidebar-link-active' : ''}`}
              title="Monitoring Dashboard"
            >
              <Building size={20} />
              {!isCollapsed && (
                <span>
                  {role === 'zoneManager'
                    ? 'MY ZONE'
                    : role === 'groupManager'
                    ? 'MY GROUP'
                    : role === 'churchManager'
                    ? 'MY CHURCH'
                    : role === 'pcfLeader'
                    ? 'MY PCF'
                    : role === 'superAdmin'
                    ? 'ALL DASHBOARDS'
                    : 'MY PROGRESS'}
                </span>
              )}
            </button>

            {isSuperAdmin && (
              <>
                <button
                  onClick={() => onSelectTab('eventControl')}
                  className={`sidebar-link ${activeTab === 'eventControl' ? 'sidebar-link-active' : ''}`}
                  title="Event Control & Command Center"
                >
                  <Activity size={20} />
                  {!isCollapsed && <span>EVENT CONTROL</span>}
                </button>

                <button
                  onClick={() => onSelectTab('org')}
                  className={`sidebar-link ${activeTab === 'org' ? 'sidebar-link-active' : ''}`}
                  title="Organization Management"
                >
                  <Building size={20} />
                  {!isCollapsed && <span>ORGANIZATION</span>}
                </button>

                <button
                  onClick={() => onSelectTab('importData')}
                  className={`sidebar-link ${activeTab === 'importData' ? 'sidebar-link-active' : ''}`}
                  title="Bulk Data Import"
                >
                  <Database size={20} />
                  {!isCollapsed && <span>IMPORT DATA</span>}
                </button>
              </>
            )}

            <button
              onClick={() => onSelectTab('account')}
              className={`sidebar-link ${activeTab === 'account' ? 'sidebar-link-active' : ''}`}
              title="My Account"
            >
              <div className="nav-tab-icon-wrapper">
                <User size={20} />
                {isPendingAssignment && (
                  <span className="indicator-dot" title="Pending PCF assignment" />
                )}
              </div>
              {!isCollapsed && <span>MY ACCOUNT</span>}
            </button>
          </>
        )}
      </nav>

      {/* Sidebar Footer / User Account Section */}
      <div className="sidebar-footer">
        {isAuthenticated && userProfile ? (
          <div className="sidebar-user-card">
            <div className="user-avatar">{userProfile.name.charAt(0).toUpperCase()}</div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="user-name">{userProfile.name}</span>
                <span className="user-role">{userProfile.role}</span>
              </div>
            )}
            {!isCollapsed && (
              <button onClick={() => logout()} className="user-logout-btn" title="Sign Out">
                <LogOut size={16} />
              </button>
            )}
          </div>
        ) : (
          !isCollapsed && (
            <div className="sidebar-guest-card">
              <span className="guest-hint">Record souls under your account</span>
              <div className="sidebar-auth-btns">
                <button onClick={() => onOpenAuth()} className="btn-green-accent btn-sm">
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
};
