import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Church as ChurchIcon,
  Flame,
  Award,
  ChevronRight,
  TrendingUp,
  Search,
  Sparkles,
  Download,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEventConfig } from '../../hooks/useEventConfig';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { getGroups, getChurches } from '../../services/organizationService';
import { getTargets } from '../../services/targetService';
import {
  calculateGroupRaceProgress,
  calculateChurchRaceProgress,
} from '../../services/targetProgressEngine';
import { subscribeToNationalCounter, type ZonalCounterData } from '../../services/counterService';
import { downloadCustomizedSoulTemplate } from '../../services/templateRecognitionService';
import { FlipCounterDisplay } from '../public/FlipCounterDisplay';
import type { OrganizationProgress } from '../../types/target';
import type { Group } from '../../types/organization';

interface GroupHomeViewProps {
  onNavigate?: (tab: 'home' | 'record' | 'account' | 'org' | 'race' | 'dashboard') => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

export const GroupHomeView: React.FC<GroupHomeViewProps> = ({ onNavigate }) => {
  const { soulWinnerProfile } = useAuth();
  const { eventConfig, isLive } = useEventConfig();
  const [counterData, setCounterData] = useState<ZonalCounterData>({
    totalSoulsWon: 0,
    zonalTarget: eventConfig.target,
    nationalTarget: eventConfig.target,
    percentageAchieved: 0,
    groupCompetitors: [],
    groupProgresses: [],
  });

  const [groupProgress, setGroupProgress] = useState<OrganizationProgress | null>(null);
  const [allGroupProgresses, setAllGroupProgresses] = useState<OrganizationProgress[]>([]);
  const [churchesInGroup, setChurchesInGroup] = useState<OrganizationProgress[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeGroupRank, setActiveGroupRank] = useState<number>(1);

  // Subscribe to national/zonal counter
  useEffect(() => {
    const unsubscribe = subscribeToNationalCounter(eventConfig.target, (data) =>
      setCounterData(data)
    );
    return () => unsubscribe();
  }, [eventConfig.target]);

  // Load Group data and churches in this group
  useEffect(() => {
    const loadData = async () => {
      try {
        const [records, groups, churches, targets] = await Promise.all([
          getAllLocalRecords(),
          getGroups(),
          getChurches(),
          getTargets(),
        ]);

        // Find user's group or fallback to first group
        const targetGroupId = soulWinnerProfile?.groupId || groups[0]?.id || 'grp-karmo';
        const groupObj = groups.find((g) => g.id === targetGroupId) || groups[0];
        setCurrentGroup(groupObj || null);

        // Calculate all group progresses
        const groupProgresses = calculateGroupRaceProgress(records, groups, targets);
        const sortedGroups = [...groupProgresses].sort((a, b) => b.percentage - a.percentage);
        setAllGroupProgresses(sortedGroups);

        const currentProg =
          sortedGroups.find((g) => g.organizationId === targetGroupId) ||
          sortedGroups[0] ||
          null;
        setGroupProgress(currentProg);

        const rankIndex = sortedGroups.findIndex((g) => g.organizationId === targetGroupId);
        setActiveGroupRank(rankIndex >= 0 ? rankIndex + 1 : 1);

        // Calculate churches in this group
        const churchProgresses = calculateChurchRaceProgress(records, churches, targets);
        const filteredChurches = churchProgresses.filter((c) => {
          const churchDef = churches.find((ch) => ch.id === c.organizationId);
          return churchDef?.groupId === targetGroupId;
        });

        const sortedChurches = [...filteredChurches].sort((a, b) => b.percentage - a.percentage);
        setChurchesInGroup(sortedChurches);
      } catch (err) {
        console.error('Error loading group home data:', err);
      }
    };

    loadData();
  }, [soulWinnerProfile?.groupId, counterData.totalSoulsWon]);

  const targetQuota = groupProgress?.target || 4000;
  const soulsWon = groupProgress?.actual || 0;
  const percentage = groupProgress?.percentage || 0;
  const remainingSouls = Math.max(0, targetQuota - soulsWon);

  // Group share of total zonal souls
  const groupZonalShare =
    counterData.totalSoulsWon > 0
      ? Math.round((soulsWon / counterData.totalSoulsWon) * 1000) / 10
      : 0;

  const filteredChurchesList = churchesInGroup.filter(
    (c) =>
      c.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.organizationCode && c.organizationCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="role-home-container">
      {/* HEADER IDENTITY BAR */}
      <div className="role-home-top-bar">
        <div className="role-top-identity">
          <img
            src="/reachout_world_nigeria_logo.png"
            alt="ReachOut World Nigeria Logo"
            className="role-top-logo"
          />
          <div>
            <div className="role-pill-badge">GROUP LEADER PORTAL</div>
            <h1 className="role-top-title">
              {soulWinnerProfile?.groupName || currentGroup?.name || 'GROUP DASHBOARD'}
            </h1>
          </div>
        </div>

        <div className="role-top-actions">
          <button
            type="button"
            onClick={() =>
              downloadCustomizedSoulTemplate({
                level: 'group',
                groupId: soulWinnerProfile?.groupId || currentGroup?.id,
              })
            }
            className="secondary-button"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            title="Download Custom Group CSV Template"
          >
            <Download size={15} />
            <span>GROUP CSV TEMPLATE</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('record')}
              className="submit-button"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <TrendingUp size={16} />
              <span>RECORD SOULS</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-SECTION SIDE-BY-SIDE GRID */}
      <div className="role-three-col-grid">
        {/* ========================================================================= */}
        {/* SECTION 1: LEFT — GROUP TARGETS & PERFORMANCE HIGHLIGHT */}
        {/* ========================================================================= */}
        <section className="role-col-card role-col-highlight">
          <div className="role-col-header">
            <div className="role-col-icon-box icon-green">
              <Flame size={20} />
            </div>
            <div>
              <span className="role-col-tag">GROUP TARGET & PERFORMANCE</span>
              <h2 className="role-col-title">
                {soulWinnerProfile?.groupName || currentGroup?.name || 'Group Performance'}
              </h2>
            </div>
          </div>

          {/* Big Group Souls LED Display */}
          <div className="role-hero-stat-card">
            <div className="role-stat-label-row">
              <span className="role-sub-label">GROUP SOULS WON</span>
              <span
                className={`role-status-badge ${
                  percentage >= 100
                    ? 'badge-gold'
                    : percentage >= 50
                    ? 'badge-green'
                    : 'badge-amber'
                }`}
              >
                {percentage >= 100 ? '👑 QUOTA SMASHED!' : `${percentage}% OF TARGET`}
              </span>
            </div>

            <div className="role-dominant-number">
              {soulsWon.toLocaleString()}
            </div>

            <div className="role-target-meta-row">
              <div>
                <span className="meta-dim-lbl">GROUP TARGET</span>
                <span className="meta-val">{targetQuota.toLocaleString()} Souls</span>
              </div>
              <div className="meta-divider" />
              <div>
                <span className="meta-dim-lbl">REMAINING TO 100%</span>
                <span className="meta-val text-gold">
                  {remainingSouls === 0 ? 'COMPLETED 🎉' : `${remainingSouls.toLocaleString()} Souls`}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="role-progress-track">
              <div
                className="role-progress-fill"
                style={{
                  width: `${Math.min(100, percentage)}%`,
                  background:
                    percentage >= 100
                      ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                      : 'linear-gradient(90deg, #008751 0%, #00d68f 100%)',
                }}
              />
            </div>
          </div>

          {/* Group Standing & Meta Grid */}
          <div className="role-meta-tiles-grid">
            <div className="role-meta-tile">
              <Trophy size={18} className="text-gold" />
              <div>
                <span className="tile-lbl">UPWARD RACE STANDING</span>
                <span className="tile-val">
                  #{activeGroupRank}{' '}
                  <span className="tile-sub">of 20 Groups</span>
                </span>
              </div>
            </div>

            <div className="role-meta-tile">
              <ChurchIcon size={18} className="text-green" />
              <div>
                <span className="tile-lbl">CHURCHES IN GROUP</span>
                <span className="tile-val">
                  {churchesInGroup.length}{' '}
                  <span className="tile-sub">Active Units</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          {onNavigate && (
            <div className="role-col-footer-action">
              <button
                type="button"
                onClick={() => onNavigate('race')}
                className="role-quick-link-btn"
              >
                <span>View Full Upward Race Standings</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: MIDDLE — CHURCHES BREAKDOWN IN THIS GROUP */}
        {/* ========================================================================= */}
        <section className="role-col-card">
          <div className="role-col-header">
            <div className="role-col-icon-box icon-emerald">
              <ChurchIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="role-col-header-row">
                <span className="role-col-tag">GROUP CHURCHES</span>
                <span className="role-count-badge">{churchesInGroup.length} CHURCHES</span>
              </div>
              <h2 className="role-col-title">Churches in this Group</h2>
            </div>
          </div>

          {/* Search bar inside group churches */}
          <div className="role-search-box">
            <Search size={15} className="role-search-icon" />
            <input
              type="text"
              placeholder="Search church by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="role-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="role-search-clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scrollable Church List */}
          <div className="role-churches-scroll-list">
            {filteredChurchesList.length === 0 ? (
              <div className="role-empty-list">
                <ChurchIcon size={28} className="text-muted" />
                <p>No churches match your search query in this group.</p>
              </div>
            ) : (
              filteredChurchesList.map((church, idx) => {
                const chQuota = church.target || 250;
                const chWon = church.actual || 0;
                const chPct = church.percentage || 0;
                const isLeading = idx === 0 && chWon > 0;

                return (
                  <div
                    key={church.organizationId}
                    className={`role-church-item-card ${isLeading ? 'item-leading' : ''}`}
                  >
                    <div className="church-item-header">
                      <div className="church-item-title-col">
                        <div className="church-item-title-row">
                          <span className="church-item-rank">#{idx + 1}</span>
                          <span className="church-item-name">{church.organizationName}</span>
                          {isLeading && (
                            <span className="leading-crown-tag" title="Top Church in this Group">
                              👑 Top in Group
                            </span>
                          )}
                        </div>
                        {church.organizationCode && (
                          <span className="church-item-code">{church.organizationCode}</span>
                        )}
                      </div>

                      <div className="church-item-stat-col">
                        <span className="church-item-pct">{chPct}%</span>
                        <span className="church-item-counts">
                          {chWon.toLocaleString()} / {chQuota.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="church-item-progress-track">
                      <div
                        className="church-item-progress-fill"
                        style={{
                          width: `${Math.min(100, chPct)}%`,
                          background:
                            chPct >= 100
                              ? '#f59e0b'
                              : chPct >= 60
                              ? '#008751'
                              : chPct >= 30
                              ? '#0284c7'
                              : '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: RIGHT — ZONAL OVERALL TARGETS & STANDINGS */}
        {/* ========================================================================= */}
        <section className="role-col-card role-col-zonal">
          <div className="role-col-header">
            <div className="role-col-icon-box icon-gold">
              <Award size={20} />
            </div>
            <div>
              <span className="role-col-tag">ABUJA ZONE 1 OVERALL</span>
              <h2 className="role-col-title">Zonal Campaign Target</h2>
            </div>
          </div>

          {/* Digital LED Readout for Zone Total */}
          <div className="role-zonal-led-card">
            <div className="role-stat-label-row">
              <span className="role-sub-label">TOTAL ZONAL SOULS WON</span>
              <span className="role-status-badge badge-green">
                {isLive ? '🔴 LIVE TALLY' : 'ZONE TALLY'}
              </span>
            </div>

            <div className="role-zonal-led-wrapper">
              <FlipCounterDisplay value={counterData.totalSoulsWon} />
            </div>

            <div className="role-target-meta-row" style={{ marginTop: '1rem' }}>
              <div>
                <span className="meta-dim-lbl">ZONAL TARGET</span>
                <span className="meta-val">{counterData.zonalTarget.toLocaleString()} SOULS</span>
              </div>
              <div className="meta-divider" />
              <div>
                <span className="meta-dim-lbl">% OF ZONAL TARGET</span>
                <span className="meta-val text-green">{counterData.percentageAchieved}%</span>
              </div>
            </div>

            <div className="role-progress-track">
              <div
                className="role-progress-fill"
                style={{ width: `${Math.min(100, counterData.percentageAchieved)}%` }}
              />
            </div>
          </div>

          {/* Group Contribution to Zone Callout */}
          <div className="role-contribution-callout">
            <Sparkles size={20} className="text-gold" />
            <div>
              <span className="contrib-title">YOUR GROUP IMPACT</span>
              <p className="contrib-desc">
                <strong>{soulWinnerProfile?.groupName || currentGroup?.name}</strong> has contributed{' '}
                <span className="text-green font-bold">{soulsWon.toLocaleString()} souls</span> (
                <span className="text-gold font-bold">{groupZonalShare}%</span> of total Zone 1 tally).
              </p>
            </div>
          </div>

          {/* Top 3 Contending Groups Leaderboard Preview */}
          <div className="role-zonal-top-groups">
            <span className="top-groups-title">TOP CONTENDING GROUPS</span>
            <div className="top-groups-list">
              {allGroupProgresses.slice(0, 3).map((grp, idx) => (
                <div
                  key={grp.organizationId}
                  className={`top-group-row ${
                    grp.organizationId === (soulWinnerProfile?.groupId || currentGroup?.id)
                      ? 'current-user-group'
                      : ''
                  }`}
                >
                  <span className="top-group-rank">#{idx + 1}</span>
                  <span className="top-group-name">{grp.organizationName}</span>
                  <span className="top-group-pct">{grp.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
