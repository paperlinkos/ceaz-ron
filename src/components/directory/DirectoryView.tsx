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
  Users,
  ScrollText,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Trophy,
  X,
  Globe,
} from 'lucide-react';
import {
  getCompleteDirectoryData,
  exportGroupsCSV,
  exportChurchesCSV,
  exportSoulWinnersCSV,
  exportRecordsCSV,
  exportZonalExecutiveSummaryCSV,
  type CompleteDirectoryData,
} from '../../services/directoryService';

type DirectoryTab = 'groups' | 'churches' | 'soulWinners' | 'records' | 'overview';

export const DirectoryView: React.FC = () => {

  const [data, setData] = useState<CompleteDirectoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DirectoryTab>('groups');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>('all');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'targetMet' | 'inProgress'>('all');
  const [spiritualFilter, setSpiritualFilter] = useState<'all' | 'bornAgain' | 'holySpirit'>('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('soulsWon');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Printable Report Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Load complete directory data
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
  }, []);

  // Handle Sort Toggle
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    if (!data) return [];
    return data.groups
      .filter((g) => {
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
  }, [data, searchQuery, achievementFilter, sortKey, sortDirection]);

  // Filtered Churches
  const filteredChurches = useMemo(() => {
    if (!data) return [];
    return data.churches
      .filter((c) => {
        if (selectedGroupFilter !== 'all' && c.groupId !== selectedGroupFilter) return false;

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
  }, [data, selectedGroupFilter, searchQuery, achievementFilter, sortKey, sortDirection]);

  // Filtered Soul Winners
  const filteredSoulWinners = useMemo(() => {
    if (!data) return [];
    return data.soulWinners
      .filter((sw) => {
        if (selectedGroupFilter !== 'all' && sw.groupId !== selectedGroupFilter) return false;
        if (selectedChurchFilter !== 'all' && sw.churchId !== selectedChurchFilter) return false;

        const matchesSearch =
          sw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sw.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sw.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sw.churchName && sw.churchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (sw.groupName && sw.groupName.toLowerCase().includes(searchQuery.toLowerCase()));
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
  }, [data, selectedGroupFilter, selectedChurchFilter, searchQuery, sortKey, sortDirection]);

  // Filtered Records (Converts)
  const filteredRecords = useMemo(() => {
    if (!data) return [];
    return data.records
      .filter((r) => {
        if (selectedGroupFilter !== 'all' && r.groupId !== selectedGroupFilter) return false;
        if (selectedChurchFilter !== 'all' && r.churchId !== selectedChurchFilter) return false;

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
  }, [data, selectedGroupFilter, selectedChurchFilter, spiritualFilter, searchQuery, sortKey, sortDirection]);

  // Active churches in current selected group for church filter dropdown
  const availableChurchesForFilter = useMemo(() => {
    if (!data) return [];
    if (selectedGroupFilter === 'all') return data.churches;
    return data.churches.filter((c) => c.groupId === selectedGroupFilter);
  }, [data, selectedGroupFilter]);

  // Export current active view
  const handleExportCurrentView = () => {
    if (!data) return;
    if (activeTab === 'groups') {
      exportGroupsCSV(filteredGroups, `ceaz1_groups_${Date.now()}.csv`);
    } else if (activeTab === 'churches') {
      exportChurchesCSV(filteredChurches, `ceaz1_churches_${Date.now()}.csv`);
    } else if (activeTab === 'soulWinners') {
      exportSoulWinnersCSV(filteredSoulWinners, `ceaz1_soul_winners_${Date.now()}.csv`);
    } else if (activeTab === 'records') {
      exportRecordsCSV(filteredRecords, `ceaz1_souls_records_${Date.now()}.csv`);
    } else {
      exportZonalExecutiveSummaryCSV(data.summary, data.groups, `ceaz1_zonal_executive_summary_${Date.now()}.csv`);
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
              <Building2 size={28} style={{ color: '#00ff87' }} />
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>
                DIRECTORY & DATA CENTER
              </h2>
            </div>
            <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Full operational directories, search, sorting & report downloads across Abuja Zone 1, Groups, Churches, Soul Winners, and Souls Won.
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
              <span>Print Executive Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportCurrentView}
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
              <span>Export {activeTab.toUpperCase()} CSV</span>
            </button>
          </div>
        </div>

        {/* METRICS STATS BAR */}
        {data && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Souls Won
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00ff87', marginTop: '2px' }}>
                {data.summary.totalSoulsWon.toLocaleString()}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Target: {data.summary.target.toLocaleString()} ({data.summary.percentage}%)
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Groups
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {data.summary.totalGroups}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Across Abuja Zone 1</span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Churches
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {data.summary.totalChurches}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Organized Under Groups</span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Registered Soul Winners
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {data.summary.totalSoulWinners}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Ministers & Ambassadors</span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Born Again / Spirit Filled
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFD700', marginTop: '2px' }}>
                {data.summary.bornAgainCount.toLocaleString()} / {data.summary.holySpiritCount.toLocaleString()}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Confessions of Faith</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. LEVEL DIRECTORY TABS */}
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
        <button
          type="button"
          onClick={() => {
            setActiveTab('groups');
            setSortKey('soulsWon');
          }}
          style={{
            background: activeTab === 'groups' ? '#008751' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'groups' ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.1)',
            color: activeTab === 'groups' ? '#ffffff' : '#cbd5e1',
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
          <Building2 size={16} />
          <span>🏛️ Groups Directory ({data?.groups.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('churches');
            setSortKey('soulsWon');
          }}
          style={{
            background: activeTab === 'churches' ? '#008751' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'churches' ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.1)',
            color: activeTab === 'churches' ? '#ffffff' : '#cbd5e1',
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
          <Church size={16} />
          <span>⛪ Churches Directory ({data?.churches.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('soulWinners');
            setSortKey('soulsWon');
          }}
          style={{
            background: activeTab === 'soulWinners' ? '#008751' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'soulWinners' ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.1)',
            color: activeTab === 'soulWinners' ? '#ffffff' : '#cbd5e1',
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
          <Users size={16} />
          <span>👤 Soul Winners Directory ({data?.soulWinners.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('records');
            setSortKey('createdAt');
          }}
          style={{
            background: activeTab === 'records' ? '#008751' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'records' ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.1)',
            color: activeTab === 'records' ? '#ffffff' : '#cbd5e1',
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
          <ScrollText size={16} />
          <span>📜 Souls Won Records ({data?.records.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('overview');
          }}
          style={{
            background: activeTab === 'overview' ? '#008751' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'overview' ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.1)',
            color: activeTab === 'overview' ? '#ffffff' : '#cbd5e1',
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
          <Globe size={16} />
          <span>🌐 Zonal Overview</span>
        </button>
      </div>

      {/* 3. SEARCH & DYNAMIC FILTER BAR */}
      {activeTab !== 'overview' && (
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
              placeholder={`Search ${activeTab}...`}
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

          {/* Group Filter (For Churches, Soul Winners, Records) */}
          {['churches', 'soulWinners', 'records'].includes(activeTab) && (
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

          {/* Church Filter (For Soul Winners & Records) */}
          {['soulWinners', 'records'].includes(activeTab) && (
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

          {/* Spiritual Filter (For Records) */}
          {activeTab === 'records' && (
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
                <option value="all">All Converts</option>
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
                : activeTab === 'soulWinners'
                ? filteredSoulWinners.length
                : filteredRecords.length}
            </strong>{' '}
            entries
          </div>
        </div>
      )}

      {/* 4. DATA TABLES PER LEVEL */}
      {isLoading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#00ff87' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Aggregating complete directory across all levels...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: GROUPS DIRECTORY */}
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
                    <th
                      onClick={() => handleSort('soulWinnersCount')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>SOUL WINNERS</span>
                        {renderSortIcon('soulWinnersCount')}
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
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          {g.soulWinnersCount} soul winners
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CHURCHES DIRECTORY */}
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
                    <th
                      onClick={() => handleSort('soulWinnersCount')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>SOUL WINNERS</span>
                        {renderSortIcon('soulWinnersCount')}
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
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          {c.soulWinnersCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: SOUL WINNERS DIRECTORY */}
          {activeTab === 'soulWinners' && (
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
                        <span>FULL NAME</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>CONTACT</th>
                    <th
                      onClick={() => handleSort('churchName')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>CHURCH</span>
                        {renderSortIcon('churchName')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('groupName')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>GROUP</span>
                        {renderSortIcon('groupName')}
                      </div>
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>ROLE</th>
                    <th
                      onClick={() => handleSort('soulsWon')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>SOULS RECORDED</span>
                        {renderSortIcon('soulsWon')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoulWinners.map((sw, idx) => (
                    <tr
                      key={sw.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>
                        {sw.name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} style={{ color: '#00ff87' }} />
                          <span>{sw.phone || '—'}</span>
                        </div>
                        {sw.email && sw.email !== '—' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#94a3b8', fontSize: '0.74rem' }}>
                            <Mail size={12} />
                            <span>{sw.email}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#ffffff' }}>
                        {sw.churchName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                        {sw.groupName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.76rem' }}>
                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {sw.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.92rem', fontWeight: 900, color: '#00ff87' }}>
                        {sw.soulsWon}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SOULS WON RECORDS */}
          {activeTab === 'records' && (
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
                    <th
                      onClick={() => handleSort('churchName')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>CHURCH</span>
                        {renderSortIcon('churchName')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('groupName')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>GROUP</span>
                        {renderSortIcon('groupName')}
                      </div>
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>FAITH STATUS</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800 }}>RECORDED BY</th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>TIMESTAMP</span>
                        {renderSortIcon('createdAt')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, idx) => (
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
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#ffffff' }}>
                        {r.churchName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#94a3b8' }}>
                        {r.groupName}
                      </td>
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

          {/* TAB 5: ZONAL EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* TOP 5 GROUPS LEADERBOARD */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Trophy size={20} style={{ color: '#FFD700' }} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    TOP PERFORMING GROUPS
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[...data.groups]
                    .sort((a, b) => b.soulsWon - a.soulsWon)
                    .slice(0, 6)
                    .map((g, idx) => (
                      <div
                        key={g.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: idx === 0 ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: idx === 0 ? '#FFD700' : '#94a3b8' }}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>{g.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              Target: {g.target.toLocaleString()} • {g.churchesCount} churches
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00ff87' }}>
                            {g.soulsWon.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#FFD700', fontWeight: 800 }}>
                            {g.percentage}% Met
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* TOP 5 CHURCHES LEADERBOARD */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Church size={20} style={{ color: '#00ff87' }} />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    TOP PERFORMING CHURCHES
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[...data.churches]
                    .sort((a, b) => b.soulsWon - a.soulsWon)
                    .slice(0, 6)
                    .map((c, idx) => (
                      <div
                        key={c.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: idx === 0 ? '1px solid rgba(0, 255, 135, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: idx === 0 ? '#00ff87' : '#94a3b8' }}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>{c.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {c.groupName} • Target: {c.target.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00ff87' }}>
                            {c.soulsWon.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#FFD700', fontWeight: 800 }}>
                            {c.percentage}% Met
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
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
                  Printable Executive Report
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Ready to print or save as PDF via your browser print dialog
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

            {/* Official Report Content (Printed Area) */}
            <div id="printable-report-area">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#008751', letterSpacing: '0.04em' }}>
                  CHRIST EMBASSY ABUJA ZONE 1
                </h1>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  REACHOUT NIGERIA SOUL WINNING CAMPAIGN
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Executive Directory & Performance Dossier • Generated: {new Date().toLocaleString()}
                </p>
              </div>

              {/* KPI Summary Block */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
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
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL SOULS WON</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#008751', marginTop: '2px' }}>
                    {data.summary.totalSoulsWon.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Target: {data.summary.target.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>% ACHIEVED</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>
                    {data.summary.percentage}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Zonal Completion</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>GROUPS & CHURCHES</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {data.summary.totalGroups} / {data.summary.totalChurches}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Active Units</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>BORN AGAIN CONVERTS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>
                    {data.summary.bornAgainCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Confessions of Faith</div>
                </div>
              </div>

              {/* Groups Breakdown Table */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                GROUPS RACE PERFORMANCE SUMMARY
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Group Name</th>
                    <th style={{ padding: '8px 10px' }}>Target</th>
                    <th style={{ padding: '8px 10px' }}>Souls Won</th>
                    <th style={{ padding: '8px 10px' }}>% Achieved</th>
                    <th style={{ padding: '8px 10px' }}>Churches</th>
                    <th style={{ padding: '8px 10px' }}>Soul Winners</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.groups]
                    .sort((a, b) => b.soulsWon - a.soulsWon)
                    .map((g, idx) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>#{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800 }}>{g.name}</td>
                        <td style={{ padding: '8px 10px' }}>{g.target.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#008751' }}>
                          {g.soulsWon.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{g.percentage}%</td>
                        <td style={{ padding: '8px 10px' }}>{g.churchesCount}</td>
                        <td style={{ padding: '8px 10px' }}>{g.soulWinnersCount}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Official Stamp & Signoff */}
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
                  <div>Campaign Directorate & Information Systems</div>
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
