import React, { useState, useEffect } from 'react';
import { Layers, BarChart2, Church, Trophy, Search, X, ChevronLeft, ChevronRight, LayoutList, CircleDot } from 'lucide-react';
import { AppleProgressRingsWidget } from './AppleProgressRingsWidget';
import { UpwardRaceVisualization } from './UpwardRaceVisualization';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { getGroups, getChurches, DEFAULT_CHURCHES, DEFAULT_GROUPS } from '../../services/organizationService';
import { getTargets, getOfficialTarget } from '../../services/targetService';
import { calculateChurchRaceProgress, calculateGroupRaceProgress } from '../../services/targetProgressEngine';
import type { OrganizationProgress } from '../../types/target';
import type { ZonalCounterData } from '../../services/counterService';
import type { EventStatus } from '../../config/eventConfig';
import { LiveUpdatesTicker } from '../common/LiveUpdatesTicker';

interface BigScreenDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  counterData: ZonalCounterData;
  eventStatus: EventStatus;
}

interface ChurchStandingItem {
  id: string;
  name: string;
  code: string;
  groupName: string;
  soulsWon: number;
  target: number;
  percentage: number;
  displayPercentage: string;
  isTargetExceeded: boolean;
}

function buildInitialChurchStandings(): ChurchStandingItem[] {
  const groupMap = new Map<string, string>();
  DEFAULT_GROUPS.forEach((g) => groupMap.set(g.id, g.name));

  return DEFAULT_CHURCHES.map((c) => {
    const target = getOfficialTarget('church', c.id) || 250;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      groupName: groupMap.get(c.groupId) || 'Abuja Zone 1',
      soulsWon: 0,
      target,
      percentage: 0,
      displayPercentage: '0%',
      isTargetExceeded: false,
    };
  });
}

export const BigScreenDisplayModal: React.FC<BigScreenDisplayModalProps> = ({
  isOpen,
  onClose,
  counterData,
  eventStatus,
}) => {
  const [activePage, setActivePage] = useState<'counter' | 'groups' | 'churches'>('counter');

  const [churchStandings, setChurchStandings] = useState<ChurchStandingItem[]>(buildInitialChurchStandings);
  const [topGroups, setTopGroups] = useState<OrganizationProgress[]>([]);
  const [churchSearchQuery, setChurchSearchQuery] = useState<string>('');
  const [churchViewMode, setChurchViewMode] = useState<'cards' | 'rings'>('cards');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  // Keyboard controls: 1 = Counter, 2 = Groups, 3 = Churches, Esc = Exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '1') {
        setActivePage('counter');
      } else if (e.key === '2') {
        setActivePage('groups');
      } else if (e.key === '3') {
        setActivePage('churches');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load standings for Page 1 & Page 3
  useEffect(() => {
    if (!isOpen) return;

    const loadStandings = async () => {
      try {
        const [records, groups, churches, targets] = await Promise.all([
          getAllLocalRecords(),
          getGroups(),
          getChurches(),
          getTargets(),
        ]);

        const groupProgresses = calculateGroupRaceProgress(records, groups, targets);
        setTopGroups(groupProgresses);

        const groupMap = new Map<string, string>();
        groups.forEach((g) => groupMap.set(g.id, g.name));

        const churchProgresses = calculateChurchRaceProgress(records, churches, targets);

        const mapped: ChurchStandingItem[] = churchProgresses.map((cp) => {
          const churchObj = churches.find((c) => c.id === cp.organizationId);
          const groupName = churchObj ? (groupMap.get(churchObj.groupId) || 'Abuja Zone 1') : 'Abuja Zone 1';

          return {
            id: cp.organizationId,
            name: cp.organizationName,
            code: cp.organizationCode || '',
            groupName,
            soulsWon: cp.actual,
            target: cp.target,
            percentage: cp.percentage,
            displayPercentage: cp.displayPercentage,
            isTargetExceeded: cp.isTargetExceeded,
          };
        });

        if (mapped.length > 0) {
          setChurchStandings(mapped);
        } else {
          setChurchStandings(buildInitialChurchStandings());
        }
      } catch (err) {
        console.warn('Error loading standings for projector:', err);
      }
    };

    loadStandings();
  }, [isOpen, counterData]);

  if (!isOpen) return null;

  return (
    <div className="big-screen-backdrop" role="dialog" aria-modal="true" aria-label="Big Screen Live Display Mode">
      {/* LEFT SIDE COLLAPSIBLE PROJECTOR NAVIGATION DOCK */}
      <div className={`big-screen-left-dock ${isDockCollapsed ? 'dock-collapsed' : 'dock-expanded'}`}>
        <button
          type="button"
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="dock-toggle-btn"
          title={isDockCollapsed ? 'Expand Navigation Menu' : 'Collapse Navigation Menu'}
        >
          {isDockCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isDockCollapsed && <span style={{ fontSize: '0.74rem', fontWeight: '800', letterSpacing: '0.04em' }}>COLLAPSE MENU</span>}
        </button>

        <div className="dock-divider" />

        <button
          type="button"
          onClick={() => setActivePage('counter')}
          className={`dock-btn ${activePage === 'counter' ? 'dock-btn-active' : ''}`}
          title="Overall Counter (Press 1)"
        >
          <Layers size={18} />
          {!isDockCollapsed && <span>OVERALL COUNTER</span>}
        </button>

        <button
          type="button"
          onClick={() => setActivePage('groups')}
          className={`dock-btn ${activePage === 'groups' ? 'dock-btn-active' : ''}`}
          title="Groups Race (Press 2)"
        >
          <BarChart2 size={18} />
          {!isDockCollapsed && <span>GROUPS RACE</span>}
        </button>

        <button
          type="button"
          onClick={() => setActivePage('churches')}
          className={`dock-btn ${activePage === 'churches' ? 'dock-btn-active' : ''}`}
          title="Churches Standings (Press 3)"
        >
          <Church size={18} />
          {!isDockCollapsed && <span>CHURCHES STANDINGS</span>}
        </button>

        <div className="dock-divider" />

        <button
          type="button"
          onClick={onClose}
          className="dock-btn"
          style={{ color: '#ef4444' }}
          title="Exit Big Screen Mode (Esc)"
        >
          <X size={18} />
          {!isDockCollapsed && <span>EXIT BIG SCREEN</span>}
        </button>
      </div>

      <div
        className={`big-screen-container ${isDockCollapsed ? 'dock-offset-collapsed' : 'dock-offset-expanded'}`}
      >
        {/* TOP BAR WITH OFFICIAL REACHOUT WORLD LOGO ON TOP-LEFT AND EXIT BUTTON ON RIGHT */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.25rem', paddingBottom: '4px' }}>
          <div className="big-screen-top-left-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/reachout_world_nigeria_logo.png"
              alt="ReachOut World Nigeria Logo"
              style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', fontWeight: 800, color: '#008751', letterSpacing: '0.08em' }}>
                  CHRIST EMBASSY ABUJA ZONE 1
                </span>
                {eventStatus === 'live' && (
                  <span className="big-status-pill live-badge" style={{ padding: '1px 6px', fontSize: '0.58rem' }}>
                    <span className="live-dot" style={{ width: '5px', height: '5px' }} /> LIVE
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>
                REACHOUT WORLD NIGERIA CAMPAIGN
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="big-screen-exit-btn"
            style={{ padding: '4px 12px', fontSize: '0.72rem' }}
            title="Exit Big Screen Mode (Esc)"
          >
            <X size={14} />
            <span>EXIT FULLSCREEN</span>
          </button>
        </div>

        {/* PAGE 1: SPACEX COUNTDOWN NUMBERING HERO VIEW (ONE NON-SCROLLING VIEWPORT CARD) */}
        {activePage === 'counter' && (
          <div className="spacex-screen-hero">
            <div style={{ textAlign: 'center', marginTop: '2px' }}>
              <h1 className="spacex-screen-title">CEAZ1 REACHOUT NIGERIA</h1>
              <div className="spacex-screen-subtitle">SOUL WINNING CAMPAIGN HARVEST TRACKER</div>
            </div>

            {/* MASSIVE HERO SOULS WON DISPLAY - EXPANDS ACROSS THE CENTRAL COMMAND STAGE */}
            <div className="spacex-souls-hero-stage">
              <div className="spacex-stat-col spacex-souls-col">
                <div className="spacex-stat-num spacex-souls-num">
                  {counterData.totalSoulsWon.toLocaleString()}
                </div>
                <div className="spacex-stat-lbl spacex-souls-lbl">SOULS WON</div>
              </div>
            </div>

            {/* LOWER SECTION: TARGET & PERCENTAGE MOVED LOWER, SITTING JUST ABOVE THE TOP 5 WIDGET */}
            <div className="spacex-lower-section">
              <div className="spacex-target-achieved-row">
                <div className="spacex-stat-col spacex-substat-col">
                  <div className="spacex-stat-num spacex-substat-num">
                    {counterData.zonalTarget.toLocaleString()}
                  </div>
                  <div className="spacex-stat-lbl">ZONAL TARGET</div>
                </div>

                <div className="spacex-row-divider" />

                <div className="spacex-stat-col spacex-substat-col">
                  <div className="spacex-stat-num spacex-substat-num spacex-achieved-num">
                    {counterData.percentageAchieved}%
                  </div>
                  <div className="spacex-stat-lbl">ACHIEVED</div>
                </div>
              </div>

              {/* TOP 5 PERFORMING GROUPS - RESTS CLEANLY AT THE BOTTOM JUST ABOVE RUNNING TEXT */}
              <div className="spacex-bottom-widget-wrap">
                <AppleProgressRingsWidget
                  groups={topGroups && topGroups.length > 0 ? topGroups : counterData.groupCompetitors}
                  onViewAll={() => setActivePage('groups')}
                />
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: GROUPS RACE VIEW (WITH MINI OVERALL ZONAL PROGRESS BAR) */}
        {activePage === 'groups' && (
          <div className="big-screen-page-groups" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, height: '100%', minHeight: 'calc(100vh - 160px)' }}>
            {/* MINI PERSISTENT OVERALL ZONAL TARGET PROGRESS BAR */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1.5px solid rgba(0, 135, 81, 0.18)',
                boxShadow: '0 10px 30px rgba(0, 135, 81, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'Orbitron', sans-serif" }}>
                  <Trophy size={16} style={{ color: '#008751' }} />
                  <span>OVERALL ZONAL TARGET PROGRESS:</span>
                  <strong style={{ color: '#008751', fontSize: '1.1rem', fontFamily: "'Share Tech Mono', monospace" }}>
                    {counterData.totalSoulsWon.toLocaleString()}
                  </strong>
                  <span style={{ color: '#475569', fontFamily: "'Share Tech Mono', monospace" }}>/ {counterData.zonalTarget.toLocaleString()} SOULS</span>
                </span>
                <span style={{ fontWeight: '900', color: '#008751', fontSize: '1.15rem', fontFamily: "'Orbitron', sans-serif" }}>
                  {counterData.percentageAchieved}% ACHIEVED
                </span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'rgba(0, 135, 81, 0.08)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0, 135, 81, 0.15)' }}>
                <div
                  style={{
                    width: `${Math.min(100, counterData.percentageAchieved)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #008751 0%, #00b36b 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>

            {/* DEDICATED GROUP BAR CHART (FULL HEIGHT) */}
            <div className="big-screen-race-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <UpwardRaceVisualization competitors={counterData.groupCompetitors} variant="barChart" fullHeight />
            </div>
          </div>
        )}

        {/* PAGE 3: CHURCHES STANDINGS VIEW (WITH MINI OVERALL ZONAL PROGRESS BAR) */}
        {activePage === 'churches' && (
          <div className="big-screen-page-churches" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* MINI PERSISTENT OVERALL ZONAL TARGET PROGRESS BAR */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1.5px solid rgba(0, 135, 81, 0.18)',
                boxShadow: '0 10px 30px rgba(0, 135, 81, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'Orbitron', sans-serif" }}>
                  <Trophy size={16} style={{ color: '#008751' }} />
                  <span>OVERALL ZONAL TARGET PROGRESS:</span>
                  <strong style={{ color: '#008751', fontSize: '1.1rem', fontFamily: "'Share Tech Mono', monospace" }}>
                    {counterData.totalSoulsWon.toLocaleString()}
                  </strong>
                  <span style={{ color: '#475569', fontFamily: "'Share Tech Mono', monospace" }}>/ {counterData.zonalTarget.toLocaleString()} SOULS</span>
                </span>
                <span style={{ fontWeight: '900', color: '#008751', fontSize: '1.15rem', fontFamily: "'Orbitron', sans-serif" }}>
                  {counterData.percentageAchieved}% ACHIEVED
                </span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'rgba(0, 135, 81, 0.08)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0, 135, 81, 0.15)' }}>
                <div
                  style={{
                    width: `${Math.min(100, counterData.percentageAchieved)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #008751 0%, #00b36b 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>

            {/* CHURCHES STANDINGS GRID */}
            <div style={{ background: 'rgba(255, 255, 255, 0.85)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0, 135, 81, 0.2)', boxShadow: '0 10px 30px rgba(0, 135, 81, 0.05)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px dashed rgba(0, 135, 81, 0.2)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Church size={22} style={{ color: '#008751' }} />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif", margin: 0, letterSpacing: '0.04em' }}>
                    CHURCHES STANDINGS LEADERBOARD
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* SEARCH INPUT */}
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search by church name..."
                      value={churchSearchQuery}
                      onChange={(e) => setChurchSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 36px',
                        borderRadius: '20px',
                        border: '1.5px solid rgba(0, 135, 81, 0.25)',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {churchSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setChurchSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* VIEW MODE TOGGLE */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f1f5f9',
                      padding: '3px',
                      borderRadius: '20px',
                      border: '1.5px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setChurchViewMode('cards')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '16px',
                        border: 'none',
                        background: churchViewMode === 'cards' ? '#008751' : 'transparent',
                        color: churchViewMode === 'cards' ? '#ffffff' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Switch to detailed Card List view"
                    >
                      <LayoutList size={14} />
                      <span>CARDS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChurchViewMode('rings')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '16px',
                        border: 'none',
                        background: churchViewMode === 'rings' ? '#008751' : 'transparent',
                        color: churchViewMode === 'rings' ? '#ffffff' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Switch to Apple-style Circular Progress Rings view"
                    >
                      <CircleDot size={14} />
                      <span>CIRCULAR RINGS</span>
                    </button>
                  </div>

                  <span style={{ fontSize: '0.85rem', fontWeight: '800', padding: '4px 12px', borderRadius: '16px', background: 'rgba(0, 135, 81, 0.1)', color: '#008751', border: '1px solid rgba(0, 135, 81, 0.2)', fontFamily: "'Orbitron', sans-serif" }}>
                    {churchStandings.filter((c) => {
                      if (!churchSearchQuery.trim()) return true;
                      const q = churchSearchQuery.toLowerCase().trim();
                      return (
                        c.name.toLowerCase().includes(q) ||
                        (c.code && c.code.toLowerCase().includes(q))
                      );
                    }).length} OF {churchStandings.length} CHURCHES
                  </span>
                </div>
              </div>

              {churchStandings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontStyle: 'italic', fontWeight: '600' }}>
                  Loading church standings...
                </div>
              ) : (
                (() => {
                  const filtered = churchStandings.filter((c) => {
                    if (!churchSearchQuery.trim()) return true;
                    const q = churchSearchQuery.toLowerCase().trim();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      (c.code && c.code.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#475569', background: 'rgba(0, 135, 81, 0.03)', borderRadius: '12px', fontWeight: '600' }}>
                        No churches found matching "{churchSearchQuery}".
                      </div>
                    );
                  }

                  const radius = 34;
                  const circumference = 2 * Math.PI * radius; // ~213.63

                  if (churchViewMode === 'rings') {
                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                          gap: '16px',
                        }}
                      >
                        {filtered.map((c) => {
                          const originalIndex = churchStandings.findIndex((orig) => orig.id === c.id);
                          const isFirst = originalIndex === 0;
                          const isTop3 = originalIndex < 3;
                          const progressFraction = Math.min(1, Math.max(0, c.percentage / 100));
                          const strokeOffset = circumference - progressFraction * circumference;
                          const isOverTarget = c.percentage >= 100;

                          return (
                            <div
                              key={c.id}
                              className="apple-ring-item"
                              style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: isFirst
                                  ? '2px solid #d97706'
                                  : isTop3
                                  ? '1.5px solid rgba(217, 119, 6, 0.4)'
                                  : '1px solid rgba(0, 135, 81, 0.12)',
                                boxShadow: isFirst
                                  ? '0 8px 24px rgba(217, 119, 6, 0.18)'
                                  : '0 4px 14px rgba(0, 0, 0, 0.03)',
                                padding: '16px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                              }}
                            >
                              {/* CIRCULAR SVG PROGRESS RING */}
                              <div className="apple-ring-svg-box">
                                <svg
                                  width="88"
                                  height="88"
                                  viewBox="0 0 88 88"
                                  className="apple-ring-svg"
                                  style={{ display: 'block' }}
                                >
                                  {/* Background Track Circle */}
                                  <circle
                                    cx="44"
                                    cy="44"
                                    r={radius}
                                    fill="none"
                                    stroke="rgba(0, 135, 81, 0.14)"
                                    strokeWidth="8"
                                    className="apple-ring-track"
                                  />
                                  {/* Active Foreground Progress Circle */}
                                  <circle
                                    cx="44"
                                    cy="44"
                                    r={radius}
                                    fill="none"
                                    stroke={isFirst || isOverTarget ? '#d97706' : '#008751'}
                                    strokeWidth="8"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeOffset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 44 44)"
                                    className={`apple-ring-progress ${isFirst || isOverTarget ? 'ring-gold' : 'ring-green'}`}
                                  />
                                </svg>

                                {/* Center Content Inside Circle */}
                                <div className="apple-ring-center-content">
                                  {isFirst ? (
                                    <Trophy size={22} style={{ color: '#d97706' }} />
                                  ) : (
                                    <span
                                      className="apple-ring-rank-text"
                                      style={{
                                        fontSize: originalIndex >= 99 ? '0.82rem' : '0.98rem',
                                        color: isTop3 ? '#b45309' : '#008751',
                                      }}
                                    >
                                      #{originalIndex + 1}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* PERCENTAGE READOUT */}
                              <div
                                className={`apple-ring-percentage ${isFirst || isOverTarget ? 'percent-gold' : 'percent-green'}`}
                                style={{ marginTop: '10px', fontSize: '1.22rem' }}
                              >
                                {c.displayPercentage}
                              </div>

                              {/* CHURCH NAME */}
                              <div
                                className="apple-ring-group-name"
                                title={c.name}
                                style={{
                                  marginTop: '4px',
                                  fontSize: '0.84rem',
                                  fontWeight: '800',
                                  maxWidth: '155px',
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {c.name}
                              </div>

                              {/* PARENT GROUP NAME */}
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#64748b',
                                  fontWeight: '700',
                                  marginTop: '2px',
                                  maxWidth: '155px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {c.groupName}
                              </div>

                              {/* SOULS WON / TARGET */}
                              <div
                                style={{
                                  fontFamily: "'Share Tech Mono', monospace",
                                  fontSize: '0.75rem',
                                  color: '#008751',
                                  fontWeight: '700',
                                  marginTop: '6px',
                                  background: 'rgba(0, 135, 81, 0.08)',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                }}
                              >
                                {c.soulsWon.toLocaleString()} / {c.target > 0 ? c.target.toLocaleString() : 'N/A'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px' }}>
                      {filtered.map((c) => {
                        const originalIndex = churchStandings.findIndex((orig) => orig.id === c.id);
                        const cRank = originalIndex === 0 ? '🥇 1st' : originalIndex === 1 ? '🥈 2nd' : originalIndex === 2 ? '🥉 3rd' : `#${originalIndex + 1}`;
                        const rankColor = originalIndex === 0 ? '#d97706' : '#475569';

                        return (
                          <div
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              background: '#ffffff',
                              borderRadius: '12px',
                              border: '1px solid rgba(0, 135, 81, 0.1)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: '900', fontFamily: "'Orbitron', sans-serif", color: rankColor, minWidth: '42px' }}>
                                {cRank}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.name}
                                  </span>
                                  {c.code && (
                                    <span style={{ color: '#475569', fontWeight: '600', fontSize: '0.78rem' }}>
                                      ({c.code})
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>
                                  {c.groupName}
                                </span>
                                <div className="child-progress-track" style={{ height: '6px', marginTop: '6px', width: '100%', maxWidth: '240px', background: 'rgba(0, 135, 81, 0.05)' }}>
                                  <div
                                    className="child-progress-fill"
                                    style={{ width: `${Math.min(100, c.percentage)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', minWidth: '85px' }}>
                              <span style={{ fontWeight: '900', color: '#008751', fontSize: '0.92rem', fontFamily: "'Share Tech Mono', monospace" }}>
                                {c.displayPercentage}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: '600', fontFamily: "'Share Tech Mono', monospace" }}>
                                {c.soulsWon.toLocaleString()} / {c.target > 0 ? c.target.toLocaleString() : 'Not Set'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>

      {/* DOCKED BOTTOM LIVE RUNNING UPDATES MARQUEE */}
      <LiveUpdatesTicker isBigScreen={true} />
    </div>
  );
};

