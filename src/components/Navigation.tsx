import { Home, HeartHandshake, User, Building, Trophy, Activity, LayoutDashboard, FolderTree } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType = 'home' | 'record' | 'account' | 'org' | 'race' | 'about' | 'dashboard' | 'eventControl' | 'importData' | 'directory';

interface NavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { isAuthenticated, isPendingAssignment, role, isRoleVerified } = useAuth();
  const isObserverMode = !isAuthenticated || !role;
  const isSuperAdmin = role === 'superAdmin' && isRoleVerified;

  // In Observer Mode: ONLY Home and Upward Race tabs are visible
  if (isObserverMode) {
    return (
      <nav className="bottom-nav">
        <button
          onClick={() => onSelectTab('home')}
          className={`nav-tab ${activeTab === 'home' ? 'nav-tab-active' : ''}`}
        >
          <Home size={18} />
          <span>HOME</span>
        </button>

        <button
          onClick={() => onSelectTab('race')}
          className={`nav-tab ${activeTab === 'race' ? 'nav-tab-active' : ''}`}
        >
          <Trophy size={18} />
          <span>RACE</span>
        </button>

        <button
          onClick={() => onSelectTab('directory')}
          className={`nav-tab ${activeTab === 'directory' ? 'nav-tab-active' : ''}`}
        >
          <FolderTree size={18} />
          <span>DIRECTORY</span>
        </button>
      </nav>
    );
  }

  const showRaceTab = role !== 'soulWinner';

  return (
    <nav className="bottom-nav">
      <button
        onClick={() => onSelectTab('home')}
        className={`nav-tab ${activeTab === 'home' ? 'nav-tab-active' : ''}`}
      >
        <Home size={18} />
        <span>HOME</span>
      </button>

      {showRaceTab && (
        <button
          onClick={() => onSelectTab('race')}
          className={`nav-tab ${activeTab === 'race' ? 'nav-tab-active' : ''}`}
        >
          <Trophy size={18} />
          <span>RACE</span>
        </button>
      )}

      <button
        onClick={() => onSelectTab('record')}
        className={`nav-tab ${activeTab === 'record' ? 'nav-tab-active' : ''}`}
      >
        <HeartHandshake size={18} />
        <span>RECORD</span>
      </button>

      <button
        onClick={() => onSelectTab('dashboard')}
        className={`nav-tab ${activeTab === 'dashboard' ? 'nav-tab-active' : ''}`}
      >
        <LayoutDashboard size={18} />
        <span>DASHBOARD</span>
      </button>

      <button
        onClick={() => onSelectTab('directory')}
        className={`nav-tab ${activeTab === 'directory' ? 'nav-tab-active' : ''}`}
      >
        <FolderTree size={18} />
        <span>DIRECTORY</span>
      </button>

      {isSuperAdmin && (
        <>
          <button
            onClick={() => onSelectTab('eventControl')}
            className={`nav-tab ${activeTab === 'eventControl' ? 'nav-tab-active' : ''}`}
          >
            <Activity size={18} />
            <span>CONTROL</span>
          </button>
          <button
            onClick={() => onSelectTab('org')}
            className={`nav-tab ${activeTab === 'org' ? 'nav-tab-active' : ''}`}
          >
            <Building size={18} />
            <span>ORG</span>
          </button>
        </>
      )}

      <button
        onClick={() => onSelectTab('account')}
        className={`nav-tab ${activeTab === 'account' ? 'nav-tab-active' : ''}`}
      >
        <div className="nav-tab-icon-wrapper">
          <User size={18} />
          {isAuthenticated && isPendingAssignment && (
            <span className="indicator-dot" title="Pending assignment" />
          )}
        </div>
        <span>ACCOUNT</span>
      </button>
    </nav>
  );
};
