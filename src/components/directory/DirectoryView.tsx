import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Church,
  ScrollText,
  RefreshCw,
  Phone,
  MapPin,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  getCompleteDirectoryData,
  exportGroupsCSV,
  exportChurchesCSV,
  exportRecordsCSV,
  type CompleteDirectoryData,
} from '../../services/directoryService';
import { subscribeToSyncStatus } from '../../services/syncService';
import { useAuth } from '../../context/AuthContext';
import { getUserScope } from '../../services/roleScopeService';

type DirectoryTab = 'groups' | 'churches' | 'souls';

export const DirectoryView: React.FC = () => {
  const { userProfile, soulWinnerProfile, role, isRoleVerified } = useAuth();
  const userScope = getUserScope(userProfile, soulWinnerProfile);

  const isSuperAdmin = role === 'superAdmin' && isRoleVerified;
  const isZoneAdmin = role === 'zoneManager';
  const isGroupAdmin = role === 'groupManager';
  const isChurchAdmin = role === 'churchManager';

  // Role-based Available Tabs
  // Super Admin & Zonal Admin: Directory of Groups, Directory of Churches, Directory of Souls
  // Group Admin: Directory of Groups (their group), Directory of Churches (their churches), Directory of Souls (their souls)
  // Church Admin: ONLY Directory of Souls ("Churches can see the souls")
  const availableTabs = useMemo(() => {
    if (isChurchAdmin) {
      return [
        { id: 'souls' as DirectoryTab, label: 'Directory of Souls', icon: ScrollText },
      ];
    }
    return [
      { id: 'groups' as DirectoryTab, label: 'Directory of Groups', icon: Building2 },
      { id: 'churches' as DirectoryTab, label: 'Directory of Churches', icon: Church },
      { id: 'souls' as DirectoryTab, label: 'Directory of Souls', icon: ScrollText },
    ];
  }, [isChurchAdmin]);

  const [activeTab, setActiveTab] = useState<DirectoryTab>(isChurchAdmin ? 'souls' : 'groups');
  const [data, setData] = useState<CompleteDirectoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>(
    isGroupAdmin && userScope.groupId ? userScope.groupId : 'all'
  );
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>(
    isChurchAdmin && userScope.churchId ? userScope.churchId : 'all'
  );
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'targetMet' | 'inProgress'>('all');
  const [spiritualFilter, setSpiritualFilter] = useState<'all' | 'bornAgain' | 'holySpirit'>('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<string>(isChurchAdmin ? 'createdAt' : 'soulsWon');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Printable Report Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Keep group/church filter locked if scoped
  useEffect(() => {
    if (isGroupAdmin && userScope.groupId) {
      setSelectedGroupFilter(userScope.groupId);
    }
    if (isChurchAdmin && userScope.churchId) {
      setSelectedChurchFilter(userScope.churchId);
      setActiveTab('souls');
    }
  }, [isGroupAdmin, isChurchAdmin, userScope.groupId, userScope.churchId]);

  const loadDirectory = async () => {
    setIsLoading(true);
    try {
      const res = await getCompleteDirectoryData();
      setData(res);
    } catch (err) {
      console.error('Failed to load directory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();

    const unsubscribe = subscribeToSyncStatus(() => {
      loadDirectory();
    });

    const handleRecordChange = () => {
      loadDirectory();
    };

    window.addEventListener('ron_record_change', handleRecordChange);

    return () => {
      unsubscribe();
      window.removeEventListener('ron_record_change', handleRecordChange);
    };
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // 1. Filtered Groups (Scoped: Group Admin sees only their group, Super Admin/Zonal Admin sees all)
  const filteredGroups = useMemo(() => {
    if (!data) return [];
    return data.groups
      .filter((g) => {
        // Role Scope check
        if (isGroupAdmin && userScope.groupId && g.id !== userScope.groupId) {
          return false;
        }

        const matchesSearch =
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.code.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (achievementFilter === 'targetMet') return g.percentage >= 100;
        if (achievementFilter === 'inProgress') return g.percentage < 100;

        return true;
      })
      .sort((a, b) => {
        let valA: any = (a as any)[sortKey];
        let valB: any = (b as any)[sortKey];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data, isGroupAdmin, userScope.groupId, searchQuery, achievementFilter, sortKey, sortDirection]);

  // 2. Filtered Churches (Scoped: Group Admin sees only their group's churches)
  const filteredChurches = useMemo(() => {
    if (!data) return [];
    const activeGroupId = isGroupAdmin && userScope.groupId ? userScope.groupId : selectedGroupFilter;

    return data.churches
      .filter((c) => {
        if (activeGroupId !== 'all' && c.groupId !== activeGroupId) return false;

        const matchesSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.groupName.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (achievementFilter === 'targetMet') return c.percentage >= 100;
        if (achievementFilter === 'inProgress') return c.percentage < 100;

        return true;
      })
      .sort((a, b) => {
        let valA: any = (a as any)[sortKey];
        let valB: any = (b as any)[sortKey];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data, isGroupAdmin, userScope.groupId, selectedGroupFilter, searchQuery, achievementFilter, sortKey, sortDirection]);

  // 3. Filtered Souls Records (Scoped: Church Admin sees church souls, Group Admin sees group souls)
  const filteredSouls = useMemo(() => {
    if (!data) return [];
    const activeGroupId = isGroupAdmin && userScope.groupId ? userScope.groupId : selectedGroupFilter;
    const activeChurchId = isChurchAdmin && userScope.churchId ? userScope.churchId : selectedChurchFilter;

    return data.records
      .filter((r) => {
        if (activeGroupId !== 'all' && r.groupId !== activeGroupId) return false;
        if (activeChurchId !== 'all' && r.churchId !== activeChurchId) return false;

        if (spiritualFilter === 'bornAgain' && !r.isBornAgain) return false;
        if (spiritualFilter === 'holySpirit' && !r.isFilledWithHolySpirit) return false;

        const matchesSearch =
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.churchName && r.churchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.groupName && r.groupName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.soulWinnerName && r.soulWinnerName.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = (a as any)[sortKey];
        let valB: any = (b as any)[sortKey];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    data,
    isGroupAdmin,
    isChurchAdmin,
    userScope.groupId,
    userScope.churchId,
    selectedGroupFilter,
    selectedChurchFilter,
    spiritualFilter,
    searchQuery,
    sortKey,
    sortDirection,
  ]);

  // Available churches for dropdown
  const availableChurchesForFilter = useMemo(() => {
    if (!data) return [];
    const targetGroupId = isGroupAdmin && userScope.groupId ? userScope.groupId : selectedGroupFilter;
    if (targetGroupId === 'all') return data.churches;
    return data.churches.filter((c) => c.groupId === targetGroupId);
  }, [data, isGroupAdmin, userScope.groupId, selectedGroupFilter]);

  // Active Scope Label
  const scopeLabel = useMemo(() => {
    if (isSuperAdmin) return 'Full Zonal Access (Super Admin)';
    if (isZoneAdmin) return 'Abuja Zone 1 Directorate';
    if (isGroupAdmin) {
      const g = data?.groups.find((grp) => grp.id === userScope.groupId);
      return `Group: ${g ? g.name : 'Assigned Group'}`;
    }
    if (isChurchAdmin) {
      const c = data?.churches.find((ch) => ch.id === userScope.churchId);
      return `Church: ${c ? c.name : 'Assigned Church'}`;
    }
    return 'Leadership Directory';
  }, [isSuperAdmin, isZoneAdmin, isGroupAdmin, isChurchAdmin, data, userScope.groupId, userScope.churchId]);

  // Export current view CSV
  const handleExportCSV = () => {
    if (!data) return;
    const timestamp = Date.now();
    if (activeTab === 'groups') {
      exportGroupsCSV(filteredGroups, `ceaz1_groups_directory_${timestamp}.csv`);
    } else if (activeTab === 'churches') {
      exportChurchesCSV(filteredChurches, `ceaz1_churches_directory_${timestamp}.csv`);
    } else {
      exportRecordsCSV(filteredSouls, `ceaz1_souls_directory_${timestamp}.csv`);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#00ff87' }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#00ff87' }} />
    );
  };

  return (
    <div className="directory-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
      {/* 1. DIRECTORY HERO HEADER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #071710 0%, #0d2a1d 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: '1.5px solid rgba(0, 135, 81, 0.4)',
          marginBottom: '20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={26} style={{ color: '#00ff87' }} />
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
                {isChurchAdmin ? 'DIRECTORY OF SOULS' : 'CAMPAIGN DIRECTORY'}
              </h2>
              <div
                style={{
                  background: 'rgba(0, 135, 81, 0.25)',
                  border: '1px solid rgba(0, 255, 135, 0.4)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#00ff87',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ShieldCheck size={12} />
                <span>{scopeLabel}</span>
              </div>
            </div>
            <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>
              {isChurchAdmin
                ? 'Search, sort, filter, and export the souls won in your church.'
                : isGroupAdmin
                ? 'Directory of your group, its churches, and all recorded souls.'
                : 'Complete directory of groups, churches, and souls won across Abuja Zone 1.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadDirectory}
              disabled={isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {!isChurchAdmin && (
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                style={{
                  background: 'rgba(255, 215, 0, 0.12)',
                  border: '1.5px solid rgba(255, 215, 0, 0.4)',
                  color: '#FFD700',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} />
                <span>Print Report</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)',
                border: '1px solid #00ff87',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 135, 81, 0.35)',
              }}
            >
              <Download size={15} />
              <span>
                Download {activeTab === 'groups' ? 'Groups' : activeTab === 'churches' ? 'Churches' : 'Souls'} CSV
              </span>
            </button>
          </div>
        </div>

        {/* METRICS STATS BAR */}
        {data && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Souls Won ({isChurchAdmin ? 'Your Church' : isGroupAdmin ? 'Your Group' : 'Zone'})
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00ff87', marginTop: '2px' }}>
                {filteredSouls.length.toLocaleString()}
              </div>
            </div>

            {!isChurchAdmin && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Churches Included
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                  {filteredChurches.length}
                </div>
              </div>
            )}

            {!isChurchAdmin && !isGroupAdmin && (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Groups Included
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                  {filteredGroups.length}
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Born Again / Spirit Filled
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFD700', marginTop: '2px' }}>
                {filteredSouls.filter((s) => s.isBornAgain).length.toLocaleString()} /{' '}
                {filteredSouls.filter((s) => s.isFilledWithHolySpirit).length.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. THE 3 DIRECTORY TABS (Groups, Churches, Souls) */}
      {!isChurchAdmin && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '12px',
          }}
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === 'groups'
                ? filteredGroups.length
                : tab.id === 'churches'
                ? filteredChurches.length
                : filteredSouls.length;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSortKey(tab.id === 'souls' ? 'createdAt' : 'soulsWon');
                }}
                style={{
                  background: isActive ? '#008751' : 'rgba(255, 255, 255, 0.05)',
                  border: isActive ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>
                  {tab.label} ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. SEARCH & DYNAMIC FILTER BAR */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Universal Search Input */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder={
              activeTab === 'groups'
                ? 'Search groups by name or code...'
                : activeTab === 'churches'
                ? 'Search churches by name, code or group...'
                : 'Search souls by name, phone, church, or soul winner...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '9px 36px 9px 38px',
              color: '#ffffff',
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Group Filter (Only for Super Admin & Zonal Admin) */}
        {(isSuperAdmin || isZoneAdmin) && ['churches', 'souls'].includes(activeTab) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Group:</span>
            <select
              value={selectedGroupFilter}
              onChange={(e) => {
                setSelectedGroupFilter(e.target.value);
                setSelectedChurchFilter('all');
              }}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Groups ({data?.groups.length || 0})</option>
              {data?.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Church Filter (For Super Admin, Zonal Admin, Group Admin when on Souls tab) */}
        {!isChurchAdmin && activeTab === 'souls' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Church:</span>
            <select
              value={selectedChurchFilter}
              onChange={(e) => setSelectedChurchFilter(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Churches ({availableChurchesForFilter.length})</option>
              {availableChurchesForFilter.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Achievement Filter (For Groups & Churches) */}
        {['groups', 'churches'].includes(activeTab) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Target:</span>
            <select
              value={achievementFilter}
              onChange={(e) => setAchievementFilter(e.target.value as any)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Progress</option>
              <option value="targetMet">🏆 Met Target (≥100%)</option>
              <option value="inProgress">⏳ In Progress (&lt;100%)</option>
            </select>
          </div>
        )}

        {/* Spiritual Filter (For Souls) */}
        {activeTab === 'souls' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Faith:</span>
            <select
              value={spiritualFilter}
              onChange={(e) => setSpiritualFilter(e.target.value as any)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Souls</option>
              <option value="bornAgain">✨ Born Again Only</option>
              <option value="holySpirit">🔥 Holy Spirit Filled Only</option>
            </select>
          </div>
        )}

        {/* Result Counter */}
        <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94a3b8' }}>
          Showing{' '}
          <strong style={{ color: '#00ff87' }}>
            {activeTab === 'groups'
              ? filteredGroups.length
              : activeTab === 'churches'
              ? filteredChurches.length
              : filteredSouls.length}
          </strong>{' '}
          entries
        </div>
      </div>

      {/* 4. DATA TABLES PER LEVEL */}
      {isLoading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#00ff87' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Loading campaign directory data...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DIRECTORY OF GROUPS */}
          {activeTab === 'groups' && (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.5)' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800 }}>#</th>
                    <th
                      onClick={() => handleSort('name')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>GROUP NAME</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>CODE</th>
                    <th
                      onClick={() => handleSort('target')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>TARGET</span>
                        {renderSortIcon('target')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('soulsWon')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>SOULS WON</span>
                        {renderSortIcon('soulsWon')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('percentage')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>% PROGRESS</span>
                        {renderSortIcon('percentage')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('churchesCount')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>CHURCHES</span>
                        {renderSortIcon('churchesCount')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g, idx) => {
                    const isMet = g.percentage >= 100;
                    return (
                      <tr
                        key={g.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                          {g.name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.76rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {g.code}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                          {g.target.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.92rem', fontWeight: 900, color: '#00ff87' }}>
                          {g.soulsWon.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                          <span
                            style={{
                              background: isMet ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 215, 0, 0.15)',
                              color: isMet ? '#00ff87' : '#FFD700',
                              border: isMet ? '1px solid rgba(0, 255, 135, 0.3)' : '1px solid rgba(255, 215, 0, 0.3)',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                            }}
                          >
                            {g.percentage}% {isMet ? '🏆' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          {g.churchesCount} churches
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: DIRECTORY OF CHURCHES */}
          {activeTab === 'churches' && (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.5)' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800 }}>#</th>
                    <th
                      onClick={() => handleSort('name')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>CHURCH NAME</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('groupName')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>PARENT GROUP</span>
                        {renderSortIcon('groupName')}
                      </div>
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>CODE</th>
                    <th
                      onClick={() => handleSort('target')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>TARGET</span>
                        {renderSortIcon('target')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('soulsWon')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>SOULS WON</span>
                        {renderSortIcon('soulsWon')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('percentage')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>% PROGRESS</span>
                        {renderSortIcon('percentage')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChurches.map((c, idx) => {
                    const isMet = c.percentage >= 100;
                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                          {c.name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                          {c.groupName}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.76rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {c.code}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                          {c.target.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.92rem', fontWeight: 900, color: '#00ff87' }}>
                          {c.soulsWon.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                          <span
                            style={{
                              background: isMet ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 215, 0, 0.15)',
                              color: isMet ? '#00ff87' : '#FFD700',
                              border: isMet ? '1px solid rgba(0, 255, 135, 0.3)' : '1px solid rgba(255, 215, 0, 0.3)',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                            }}
                          >
                            {c.percentage}% {isMet ? '🏆' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: DIRECTORY OF SOULS */}
          {activeTab === 'souls' && (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.5)' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800 }}>#</th>
                    <th
                      onClick={() => handleSort('name')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>CONVERT NAME</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>PHONE / LOCATION</th>
                    {!isChurchAdmin && (
                      <th
                        onClick={() => handleSort('churchName')}
                        style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>CHURCH</span>
                          {renderSortIcon('churchName')}
                        </div>
                      </th>
                    )}
                    {!isChurchAdmin && !isGroupAdmin && (
                      <th
                        onClick={() => handleSort('groupName')}
                        style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>GROUP</span>
                          {renderSortIcon('groupName')}
                        </div>
                      </th>
                    )}
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>FAITH STATUS</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>RECORDED BY</th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>DATE RECORDED</span>
                        {renderSortIcon('createdAt')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSouls.map((r, idx) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                        {r.name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} style={{ color: '#00ff87' }} />
                          <span>{r.phone}</span>
                        </div>
                        {r.location && r.location !== '—' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#94a3b8', fontSize: '0.74rem' }}>
                            <MapPin size={12} />
                            <span>{r.location}</span>
                          </div>
                        )}
                      </td>
                      {!isChurchAdmin && (
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#ffffff' }}>
                          {r.churchName}
                        </td>
                      )}
                      {!isChurchAdmin && !isGroupAdmin && (
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                          {r.groupName}
                        </td>
                      )}
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {r.isBornAgain && (
                            <span
                              style={{
                                background: 'rgba(0, 255, 135, 0.12)',
                                border: '1px solid rgba(0, 255, 135, 0.3)',
                                color: '#00ff87',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              Born Again ✓
                            </span>
                          )}
                          {r.isFilledWithHolySpirit && (
                            <span
                              style={{
                                background: 'rgba(255, 215, 0, 0.12)',
                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                color: '#FFD700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              Holy Spirit 🔥
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                        {r.soulWinnerName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.76rem', color: '#94a3b8' }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 5. PRINTABLE EXECUTIVE REPORT MODAL */}
      {isPrintModalOpen && data && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#0f172a',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '32px',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header controls (Hidden during print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#008751' }}>
                  Printable Campaign Report
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {scopeLabel} • Generated: {new Date().toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#008751',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={16} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Official Report Content */}
            <div id="printable-report-area">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#008751', letterSpacing: '0.04em' }}>
                  CHRIST EMBASSY ABUJA ZONE 1
                </h1>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  REACHOUT NIGERIA SOUL WINNING CAMPAIGN
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Official Directory & Performance Dossier • {scopeLabel}
                </p>
              </div>

              {/* KPI Summary Block */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SOULS WON</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#008751', marginTop: '2px' }}>
                    {filteredSouls.length.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>CHURCHES</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {filteredChurches.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>BORN AGAIN CONVERTS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>
                    {filteredSouls.filter((s) => s.isBornAgain).length.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Performance Table */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                {isGroupAdmin ? 'CHURCHES PERFORMANCE SUMMARY' : 'GROUPS PERFORMANCE SUMMARY'}
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Name</th>
                    <th style={{ padding: '8px 10px' }}>Target</th>
                    <th style={{ padding: '8px 10px' }}>Souls Won</th>
                    <th style={{ padding: '8px 10px' }}>% Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {(isGroupAdmin ? filteredChurches : filteredGroups).map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>#{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800 }}>{item.name}</td>
                      <td style={{ padding: '8px 10px' }}>{item.target.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#008751' }}>
                        {item.soulsWon.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signoff */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '32px',
                  paddingTop: '20px',
                  borderTop: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  color: '#64748b',
                }}
              >
                <div>
                  <strong>Christ Embassy Abuja Zone 1</strong>
                  <div>Campaign Directorate</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Authenticated Official Record</strong>
                  <div>ReachOut Nigeria Campaign Live Tracker</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
