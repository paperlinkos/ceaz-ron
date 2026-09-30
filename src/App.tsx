import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StatusBanner } from './components/StatusBanner';
import { SoulRecordForm } from './components/SoulRecordForm';
import { RecentSubmissions } from './components/RecentSubmissions';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { type TabType } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { PublicHomeView } from './components/public/PublicHomeView';
import { UpwardRaceView } from './components/public/UpwardRaceView';
import { AccountView } from './components/auth/AccountView';
import { AuthModal } from './components/auth/AuthModal';
import { OrganizationManager } from './components/admin/OrganizationManager';
import { UserManagementView } from './components/admin/UserManagementView';
import { RoleDashboardView } from './components/dashboard/RoleDashboardView';
import { EventControlView } from './components/admin/EventControlView';
import { BulkImportView } from './components/admin/BulkImportView';
import { LeaderSoulEntryView } from './components/leader/LeaderSoulEntryView';
import { DirectoryView } from './components/directory/DirectoryView';
import { useSoulRecords } from './hooks/useSoulRecords';
import { useEventConfig } from './hooks/useEventConfig';
import { DevRoleSwitcher } from './components/DevRoleSwitcher';
import { LiveUpdatesTicker } from './components/common/LiveUpdatesTicker';
import { ConfettiCelebrationOverlay } from './components/common/ConfettiCelebrationOverlay';
import { Lock } from 'lucide-react';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [adminTab, setAdminTab] = useState<'org' | 'users'>('org');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode: 'login';
  }>({ isOpen: false, mode: 'login' });

  const [recordSubTab, setRecordSubTab] = useState<'form' | 'history'>('form');

  const {
    records,
    isLoading,
    isSubmitting,
    lastSubmissionStatus,
    pendingRecordsCount,
    syncedRecordsCount,
    submitRecord,
    manualSync,
  } = useSoulRecords();

  const { isAuthenticated, userProfile, role, isRoleVerified } = useAuth();
  const isSuperAdmin = role === 'superAdmin' && isRoleVerified;

  const { eventConfig } = useEventConfig();

  const prevAuthRef = useRef<boolean>(isAuthenticated);

  // Automatically trigger Sign In modal whenever user logs out
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      setAuthModalState({ isOpen: true, mode: 'login' });
      setActiveTab('home');
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Handle logout via reload (e.g. Dev Role Switcher)
  useEffect(() => {
    if (sessionStorage.getItem('ron_just_logged_out')) {
      sessionStorage.removeItem('ron_just_logged_out');
      setAuthModalState({ isOpen: true, mode: 'login' });
    }
  }, []);

  const handleOpenAuth = () => {
    setAuthModalState({ isOpen: true, mode: 'login' });
  };

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'record') {
      setRecordSubTab('form');
      if (!isAuthenticated) {
        handleOpenAuth();
      }
    }
  };

  return (
    <div className={`layout-shell ${isSidebarCollapsed ? 'layout-sidebar-collapsed' : ''}`}>
      {/* Left Collapsible Sidebar (Desktop) & Slide-out Drawer (Mobile) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAuth={handleOpenAuth}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Stage Area */}
      <div className="main-stage">
        {/* App Header (Mobile & Device Bar with Hamburger & Sign In) */}
        <div className="mobile-only-header">
          <Header
            pendingCount={pendingRecordsCount}
            syncedCount={syncedRecordsCount}
            onManualSync={manualSync}
            onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
            onOpenAuth={handleOpenAuth}
          />
        </div>

        {/* Status Alert Banners */}
        <StatusBanner
          lastStatus={lastSubmissionStatus}
          pendingCount={pendingRecordsCount}
        />

        {/* Tab Content Stage */}
        <main className="stage-content">
          {activeTab === 'home' && (
            <PublicHomeView
              onNavigate={handleSelectTab}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {activeTab === 'race' && role !== 'soulWinner' && (
            <UpwardRaceView />
          )}

          {activeTab === 'dashboard' && (
            <RoleDashboardView onNavigateTab={handleSelectTab} onOpenAuth={handleOpenAuth} />
          )}

          {activeTab === 'directory' && (isSuperAdmin || role === 'zoneManager' || role === 'groupManager' || role === 'churchManager') && (
            <DirectoryView />
          )}

          {activeTab === 'record' && (
            <>
              {!isAuthenticated ? (
                <div className="account-card empty-card">
                  <Lock size={32} className="text-gold" />
                  <h3 className="account-title">Sign In Required</h3>
                  <p className="account-lead">
                    Soul winning recording requires a registered and authenticated Soul Winner account. Anonymous soul submissions are forbidden.
                  </p>
                  <div className="account-actions">
                    <button onClick={() => handleOpenAuth()} className="submit-button">
                      Sign In with your Church Code
                    </button>
                  </div>
                </div>
              ) : role === 'churchManager' || role === 'groupManager' || role === 'zoneManager' || role === 'superAdmin' || role === 'pcfLeader' ? (
                <LeaderSoulEntryView />
              ) : (
                <div className="record-container">
                  <div className="record-subnav">
                    <button
                      type="button"
                      onClick={() => setRecordSubTab('form')}
                      className={`subtab-btn ${recordSubTab === 'form' ? 'subtab-active' : ''}`}
                    >
                      RECORD SOUL
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordSubTab('history')}
                      className={`subtab-btn ${recordSubTab === 'history' ? 'subtab-active' : ''}`}
                    >
                      MY SUBMISSIONS ({records.length})
                    </button>
                  </div>

                  {recordSubTab === 'form' ? (
                    <SoulRecordForm
                      onSubmit={submitRecord}
                      isSubmitting={isSubmitting}
                      mySoulsWon={records.length}
                      onViewHistory={() => setRecordSubTab('history')}
                      eventStatus={eventConfig.status}
                    />
                  ) : (
                    <RecentSubmissions records={records} isLoading={isLoading} />
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'eventControl' && userProfile?.role === 'superAdmin' && isRoleVerified && (
            <EventControlView />
          )}

          {activeTab === 'importData' && userProfile?.role === 'superAdmin' && isRoleVerified && (
            <BulkImportView />
          )}

          {activeTab === 'account' && (
            <AccountView onOpenAuth={handleOpenAuth} />
          )}

          {activeTab === 'org' && userProfile?.role === 'superAdmin' && isRoleVerified && (
            <div className="admin-container">
              <div className="admin-subtabs">
                <button
                  onClick={() => setAdminTab('org')}
                  className={`subtab-btn ${adminTab === 'org' ? 'subtab-active' : ''}`}
                >
                  Manage Structures & Tree
                </button>
                <button
                  onClick={() => setAdminTab('users')}
                  className={`subtab-btn ${adminTab === 'users' ? 'subtab-active' : ''}`}
                >
                  User & Role Management
                </button>
              </div>

              {adminTab === 'org' ? (
                <OrganizationManager />
              ) : (
                <UserManagementView />
              )}
            </div>
          )}
        </main>

        {/* Live Running Updates Ticker docked sticky footer at the bottom of main stage */}
        <LiveUpdatesTicker isSidebarCollapsed={isSidebarCollapsed} />
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState({ isOpen: false, mode: 'login' })}
      />

      {/* PWA Banner */}
      <PwaInstallPrompt />

      {/* Dev Role Switcher — ONLY shown in development builds, never in production */}
      {import.meta.env.DEV && <DevRoleSwitcher />}

      {/* Global Milestone & Confetti Celebration Overlay */}
      <ConfettiCelebrationOverlay />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;
