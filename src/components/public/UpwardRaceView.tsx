import React, { useState, useEffect } from 'react';
import { Trophy, Tv, Timer, Flame, ChevronDown, ChevronUp, Church, Search, X, Swords } from 'lucide-react';
import { UpwardRaceVisualization } from './UpwardRaceVisualization';
import { BigScreenDisplayModal } from './BigScreenDisplayModal';
import { FullScreenCountdownModal } from './FullScreenCountdownModal';
import { subscribeToNationalCounter, type ZonalCounterData } from '../../services/counterService';
import { useEventConfig } from '../../hooks/useEventConfig';
import { useAuth } from '../../context/AuthContext';
import type { TabType } from '../Navigation';

interface UpwardRaceViewProps {
  onNavigateTab?: (tab: TabType) => void;
}

export const UpwardRaceView: React.FC<UpwardRaceViewProps> = ({ onNavigateTab }) => {
  const { eventConfig } = useEventConfig();
  const { isAuthenticated, role } = useAuth();
  const [isDisplayModeOpen, setIsDisplayModeOpen] = useState<boolean>(false);
  const [isCountdownFullScreenOpen, setIsCountdownFullScreenOpen] = useState<boolean>(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isObserverMode = !isAuthenticated || !role;

  const targetVal = eventConfig.target >= 50000 ? eventConfig.target : 50000;
  const [counterData, setCounterData] = useState<ZonalCounterData>({
    totalSoulsWon: 0,
    zonalTarget: targetVal,
    nationalTarget: targetVal,
    percentageAchieved: 0,
    groupCompetitors: [],
    groupProgresses: [],
  });

  useEffect(() => {
    const unsubscribe = subscribeToNationalCounter(
      targetVal,
      (data) => setCounterData(data)
    );
    return () => unsubscribe();
  }, [targetVal]);

  const competitors = counterData.groupCompetitors;

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <div className="public-home-container">
      {/* RACE HERO HEADER */}
      <div className="account-card dashboard-hero-card" style={{ background: 'linear-gradient(135deg, #071710 0%, #0d2a1d 100%)', color: '#ffffff', border: '1px solid rgba(0, 135, 81, 0.4)' }}>
        <div className="dashboard-hero-top">
          <div className="dashboard-hero-header">
            <div className="hero-badge" style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
              <Trophy size={14} />
              <span>LIVE CAMPAIGN COMPETITION</span>
            </div>
            <h2 className="dashboard-org-title" style={{ color: '#ffffff', fontSize: '2rem' }}>
              UPWARD RACE TO TARGET
            </h2>
            <p className="dashboard-org-subtitle" style={{ color: '#94a3b8' }}>
              Vertical progress tracking for Groups & Churches competing to hit their CEAZ1 Reachout Nigeria soul targets. Click any group to view its churches.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('pcfArena')}
                className="submit-button"
                style={{
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  borderColor: '#f59e0b',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                }}
                title="Open Standalone PCF Arena Head-to-Head Clash"
              >
                <Swords size={16} />
                <span>PCF ARENA</span>
              </button>
            )}

            {isObserverMode && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCountdownFullScreenOpen(true)}
                  className="submit-button countdown-mode-trigger-btn-dark"
                  style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                  title="Open Fullscreen Campaign Countdown Clock"
                >
                  <Timer size={16} />
                  <span>COUNTDOWN SCREEN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDisplayModeOpen(true)}
                  className="submit-button"
                  style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                >
                  <Tv size={16} />
                  <span>PROJECT ON TV / BIG SCREEN</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* RACE SUMMARY METRICS */}
        <div className="dashboard-stats-grid" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="dash-stat-box">
            <span className="stat-label" style={{ color: '#94a3b8' }}>ZONAL SOULS WON</span>
            <span className="stat-value" style={{ color: '#008751', fontSize: '1.6rem' }}>
              {counterData.totalSoulsWon.toLocaleString()}
            </span>
          </div>

          <div className="dash-stat-divider" style={{ background: 'rgba(255,255,255,0.1)' }} />

          <div className="dash-stat-box">
            <span className="stat-label" style={{ color: '#94a3b8' }}>ZONAL TARGET</span>
            <span className="stat-value" style={{ color: '#ffffff', fontSize: '1.6rem' }}>
              {counterData.zonalTarget.toLocaleString()}
            </span>
          </div>

          <div className="dash-stat-divider" style={{ background: 'rgba(255,255,255,0.1)' }} />

          <div className="dash-stat-box">
            <span className="stat-label" style={{ color: '#94a3b8' }}>ZONAL PROGRESS</span>
            <span className="stat-value" style={{ color: '#FFD700', fontSize: '1.6rem' }}>
              {counterData.percentageAchieved}%
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED VERTICAL TRACK VISUALIZATION */}
      <section className="upward-race-section">
        <UpwardRaceVisualization competitors={competitors} />
      </section>

      {/* DETAILED LEADERBOARD TABLE */}
      <div className="account-card" style={{ background: '#ffffff' }}>
        <div className="children-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="children-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={18} className="text-gold" />
            <span>GROUP & CHURCH STANDINGS</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* SEARCH INPUT BAR */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by church name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 28px 7px 34px',
                  borderRadius: '18px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <span className="personal-count-chip">{competitors.length} GROUPS COMPETING</span>
          </div>
        </div>

        {competitors.length === 0 ? (
          <div className="race-empty-box">
            <span className="race-empty-badge">NO ACTIVITY RECORDED YET</span>
            <p className="race-empty-text">
              As soul winners record souls across Groups, real-time standings will populate here.
            </p>
          </div>
        ) : (
          (() => {
            const query = searchQuery.trim().toLowerCase();

            // Filter groups containing churches matching church name/code
            const filteredCompetitors = competitors.filter((comp) => {
              if (!query) return true;
              return comp.churches?.some(
                (c) => c.name.toLowerCase().includes(query) || (c.code && c.code.toLowerCase().includes(query))
              );
            });

            if (filteredCompetitors.length === 0) {
              return (
                <div className="race-empty-box">
                  <span className="race-empty-badge">NO MATCHES FOUND</span>
                  <p className="race-empty-text">
                    No churches found matching "{searchQuery}".
                  </p>
                </div>
              );
            }

            return (
              <div className="soul-winners-grid">
                {filteredCompetitors.map((comp) => {
                  const originalIdx = competitors.findIndex((orig) => orig.id === comp.id);
                  const rankBadge =
                    originalIdx === 0
                      ? '🥇 1st'
                      : originalIdx === 1
                      ? '🥈 2nd'
                      : originalIdx === 2
                      ? '🥉 3rd'
                      : `#${originalIdx + 1}`;

                  // Auto expand if search query matches a church inside this group
                  const hasMatchingChurch = query && comp.churches?.some(
                    (c) => c.name.toLowerCase().includes(query) || (c.code && c.code.toLowerCase().includes(query))
                  );
                  const isExpanded = !!expandedGroupIds[comp.id] || !!hasMatchingChurch;
                  const churchesCount = comp.churches ? comp.churches.length : 0;

                  // Filter churches list strictly by church name/code
                  const filteredChurches = comp.churches?.filter((c) => {
                    if (!query) return true;
                    return c.name.toLowerCase().includes(query) || (c.code && c.code.toLowerCase().includes(query));
                  });

                  return (
                    <div key={comp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                      <div
                        className={`soul-winner-row-card ${isExpanded ? 'group-row-expanded' : ''}`}
                        onClick={() => toggleGroup(comp.id)}
                        style={{
                          padding: '14px 18px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderLeft: isExpanded ? '4px solid #008751' : '1px solid var(--color-card-border-public)',
                          background: isExpanded ? 'rgba(0, 135, 81, 0.04)' : 'var(--color-bg-public)',
                          boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        }}
                        title="Click to view/hide churches under this group"
                      >
                        <div className="sw-rank" style={{ fontSize: originalIdx < 3 ? '1.1rem' : '0.9rem', fontWeight: '900', minWidth: '54px' }}>
                          {rankBadge}
                        </div>

                        <div className="sw-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="sw-name">{comp.name}</span>
                            {comp.code && (
                              <span className="child-code">({comp.code})</span>
                            )}
                            {comp.isTargetExceeded && (
                              <span className="exceeded-tag">
                                TARGET EXCEEDED
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isExpanded ? '#008751' : 'rgba(0,0,0,0.06)',
                                color: isExpanded ? '#ffffff' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <Church size={11} />
                              <span>{churchesCount} CHURCHES</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </span>
                          </div>

                          <div className="child-progress-track" style={{ marginTop: '6px' }}>
                            <div
                              className="child-progress-fill"
                              style={{
                                width: `${Math.max(2, Math.min(100, comp.percentage))}%`,
                                background:
                                  comp.percentage >= 100
                                    ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                                    : 'linear-gradient(90deg, #008751 0%, #00d68f 100%)',
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <div className="child-pct-pill">
                            <span>{comp.displayPercentage || `${comp.percentage}%`}</span>
                          </div>
                          <span className="child-code">
                            {comp.soulsWon.toLocaleString()} / {comp.target > 0 ? comp.target.toLocaleString() : 'Not Set'} souls
                          </span>
                        </div>
                      </div>

                      {/* EXPANDABLE CHURCHES ACCORDION */}
                      {isExpanded && (
                        <div
                          className="group-churches-dropdown"
                          style={{
                            margin: '4px 0 12px 28px',
                            padding: '14px 16px',
                            background: '#ffffff',
                            borderRadius: '0 0 12px 12px',
                            borderLeft: '3px solid #008751',
                            borderRight: '1px solid #e2e8f0',
                            borderBottom: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#008751', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Church size={14} />
                              <span>CHURCH STANDINGS IN {comp.name.toUpperCase()} ({churchesCount})</span>
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              Click group header to collapse
                            </span>
                          </div>

                          {churchesCount === 0 || !filteredChurches || filteredChurches.length === 0 ? (
                            <div style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0', textAlign: 'center' }}>
                              No matching churches found under this group.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {filteredChurches.map((church) => {
                                const originalCIdx = comp.churches?.findIndex((c) => c.id === church.id) ?? -1;
                                const cRank = originalCIdx === 0 ? '🥇' : originalCIdx === 1 ? '🥈' : originalCIdx === 2 ? '🥉' : `#${originalCIdx + 1}`;
                                return (
                                  <div
                                    key={church.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 14px',
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      border: '1px solid #f1f5f9',
                                      gap: '12px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', minWidth: '28px' }}>
                                        {cRank}
                                      </span>
                                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.88rem' }}>
                                            {church.name}
                                          </span>
                                          {church.code && (
                                            <span style={{ color: '#64748b', fontWeight: '500', fontSize: '0.78rem' }}>
                                              ({church.code})
                                            </span>
                                          )}
                                          {church.isTargetExceeded && (
                                            <span className="exceeded-tag" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                              EXCEEDED
                                            </span>
                                          )}
                                        </div>
                                        <div className="child-progress-track" style={{ height: '6px', marginTop: '6px', width: '100%', maxWidth: '280px' }}>
                                          <div
                                            className="child-progress-fill"
                                            style={{
                                              width: `${Math.max(2, Math.min(100, church.percentage))}%`,
                                              background:
                                                church.percentage >= 100
                                                  ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                                                  : 'linear-gradient(90deg, #008751 0%, #00d68f 100%)',
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', minWidth: '90px' }}>
                                      <span style={{ fontWeight: '800', color: '#008751', fontSize: '0.88rem' }}>
                                        {church.displayPercentage || `${church.percentage}%`}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {church.soulsWon.toLocaleString()} / {church.target > 0 ? church.target.toLocaleString() : 'Not Set'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* BIG SCREEN / TV DISPLAY MODE MODAL (Observer Mode Only) */}
      {isObserverMode && (
        <BigScreenDisplayModal
          isOpen={isDisplayModeOpen}
          onClose={() => setIsDisplayModeOpen(false)}
          counterData={counterData}
          eventStatus={eventConfig.status}
        />
      )}

      {/* DEDICATED FULL SCREEN COUNTDOWN CLOCK */}
      <FullScreenCountdownModal
        isOpen={isCountdownFullScreenOpen}
        onClose={() => setIsCountdownFullScreenOpen(false)}
      />
    </div>
  );
};

