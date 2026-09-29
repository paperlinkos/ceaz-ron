import React, { useState, useEffect } from 'react';
import {
  Church as ChurchIcon,
  Building2,
  Award,
  Trophy,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
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
import type { Church, Group } from '../../types/organization';

interface ChurchHomeViewProps {
  onNavigate?: (tab: 'home' | 'record' | 'account' | 'org' | 'race' | 'dashboard') => void;
  onOpenAuth?: () => void;
}

export const ChurchHomeView: React.FC<ChurchHomeViewProps> = ({ onNavigate }) => {
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

  const [churchProgress, setChurchProgress] = useState<OrganizationProgress | null>(null);
  const [parentGroupProgress, setParentGroupProgress] = useState<OrganizationProgress | null>(null);
  const [siblingChurches, setSiblingChurches] = useState<OrganizationProgress[]>([]);
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [churchZoneRank, setChurchZoneRank] = useState<number>(1);
  const [churchGroupRank, setChurchGroupRank] = useState<number>(1);
  const [totalChurchesCount, setTotalChurchesCount] = useState<number>(98);

  // Subscribe to zonal counter
  useEffect(() => {
    const unsubscribe = subscribeToNationalCounter(eventConfig.target, (data) =>
      setCounterData(data)
    );
    return () => unsubscribe();
  }, [eventConfig.target]);

  // Load Church, Parent Group, and Standings
  useEffect(() => {
    const loadData = async () => {
      try {
        const [records, groups, churches, targets] = await Promise.all([
          getAllLocalRecords(),
          getGroups(),
          getChurches(),
          getTargets(),
        ]);

        setTotalChurchesCount(churches.length);

        // Find user's church or fallback to first church
        const targetChurchId = soulWinnerProfile?.churchId || churches[0]?.id || 'ch-ce-kbs';
        const churchObj = churches.find((c) => c.id === targetChurchId) || churches[0];
        setCurrentChurch(churchObj || null);

        // Find parent group
        const targetGroupId =
          soulWinnerProfile?.groupId ||
          churchObj?.groupId ||
          groups[0]?.id ||
          'grp-wuye-sub-group-1';
        const groupObj = groups.find((g) => g.id === targetGroupId) || groups[0];
        setCurrentGroup(groupObj || null);

        // Calculate all churches progress
        const churchProgresses = calculateChurchRaceProgress(records, churches, targets);
        const sortedChurchesByZone = [...churchProgresses].sort(
          (a, b) => b.percentage - a.percentage
        );
        const chProg =
          sortedChurchesByZone.find((c) => c.organizationId === targetChurchId) ||
          sortedChurchesByZone[0] ||
          null;
        setChurchProgress(chProg);

        const zoneRankIndex = sortedChurchesByZone.findIndex(
          (c) => c.organizationId === targetChurchId
        );
        setChurchZoneRank(zoneRankIndex >= 0 ? zoneRankIndex + 1 : 1);

        // Sibling churches in same group
        const groupChurches = sortedChurchesByZone.filter((c) => {
          const chDef = churches.find((ch) => ch.id === c.organizationId);
          return chDef?.groupId === targetGroupId;
        });
        setSiblingChurches(groupChurches);

        const groupRankIndex = groupChurches.findIndex((c) => c.organizationId === targetChurchId);
        setChurchGroupRank(groupRankIndex >= 0 ? groupRankIndex + 1 : 1);

        // Calculate parent group progress
        const groupProgresses = calculateGroupRaceProgress(records, groups, targets);
        const parentGrp = groupProgresses.find((g) => g.organizationId === targetGroupId) || null;
        setParentGroupProgress(parentGrp);
      } catch (err) {
        console.error('Error loading church home data:', err);
      }
    };

    loadData();
  }, [soulWinnerProfile?.churchId, soulWinnerProfile?.groupId, counterData.totalSoulsWon]);

  const churchTargetQuota = churchProgress?.target || 500;
  const churchSoulsWon = churchProgress?.actual || 0;
  const churchPercentage = churchProgress?.percentage || 0;
  const churchRemaining = Math.max(0, churchTargetQuota - churchSoulsWon);

  const groupTargetQuota = parentGroupProgress?.target || 4000;
  const groupSoulsWon = parentGroupProgress?.actual || 0;
  const groupPercentage = parentGroupProgress?.percentage || 0;

  // Church share of parent group
  const churchGroupShare =
    groupSoulsWon > 0
      ? Math.round((churchSoulsWon / groupSoulsWon) * 1000) / 10
      : 0;

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
            <div className="role-pill-badge">CHURCH PORTAL</div>
            <h1 className="role-top-title">
              {soulWinnerProfile?.churchName || currentChurch?.name || 'CHURCH DASHBOARD'}
            </h1>
          </div>
        </div>

        <div className="role-top-actions">
          <button
            type="button"
            onClick={() =>
              downloadCustomizedSoulTemplate({
                level: 'church',
                churchId: soulWinnerProfile?.churchId || currentChurch?.id,
                groupId: soulWinnerProfile?.groupId || currentGroup?.id,
              })
            }
            className="secondary-button"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            title="Download Custom Church CSV Template"
          >
            <Download size={15} />
            <span>CHURCH CSV TEMPLATE</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('record')}
              className="submit-button"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <TrendingUp size={16} />
              <span>RECORD NEW SOUL</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-SECTION SIDE-BY-SIDE GRID */}
      <div className="role-three-col-grid">
        {/* ========================================================================= */}
        {/* SECTION 1: LEFT — CHURCH TARGETS & PERFORMANCE */}
        {/* ========================================================================= */}
        <section className="role-col-card role-col-highlight">
          <div className="role-col-header">
            <div className="role-col-icon-box icon-green">
              <ChurchIcon size={20} />
            </div>
            <div>
              <span className="role-col-tag">CHURCH TARGET & PROGRESS</span>
              <h2 className="role-col-title">
                {soulWinnerProfile?.churchName || currentChurch?.name || 'Church Performance'}
              </h2>
            </div>
          </div>

          {/* Big Church Souls LED Display */}
          <div className="role-hero-stat-card">
            <div className="role-stat-label-row">
              <span className="role-sub-label">CHURCH SOULS WON</span>
              <span
                className={`role-status-badge ${
                  churchPercentage >= 100
                    ? 'badge-gold'
                    : churchPercentage >= 50
                    ? 'badge-green'
                    : 'badge-amber'
                }`}
              >
                {churchPercentage >= 100
                  ? '👑 TARGET ACHIEVED!'
                  : `${churchPercentage}% OF QUOTA`}
              </span>
            </div>

            <div className="role-dominant-number">
              {churchSoulsWon.toLocaleString()}
            </div>

            <div className="role-target-meta-row">
              <div>
                <span className="meta-dim-lbl">CHURCH QUOTA</span>
                <span className="meta-val">{churchTargetQuota.toLocaleString()} Souls</span>
              </div>
              <div className="meta-divider" />
              <div>
                <span className="meta-dim-lbl">REMAINING</span>
                <span className="meta-val text-gold">
                  {churchRemaining === 0
                    ? 'COMPLETED 🎉'
                    : `${churchRemaining.toLocaleString()} Souls`}
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="role-progress-track">
              <div
                className="role-progress-fill"
                style={{
                  width: `${Math.min(100, churchPercentage)}%`,
                  background:
                    churchPercentage >= 100
                      ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                      : 'linear-gradient(90deg, #008751 0%, #00d68f 100%)',
                }}
              />
            </div>
          </div>

          {/* Standings in Zone and Group */}
          <div className="role-meta-tiles-grid">
            <div className="role-meta-tile">
              <Trophy size={18} className="text-gold" />
              <div>
                <span className="tile-lbl">ZONE STANDING</span>
                <span className="tile-val">
                  #{churchZoneRank}{' '}
                  <span className="tile-sub">of {totalChurchesCount} Churches</span>
                </span>
              </div>
            </div>

            <div className="role-meta-tile">
              <Building2 size={18} className="text-emerald" />
              <div>
                <span className="tile-lbl">GROUP STANDING</span>
                <span className="tile-val">
                  #{churchGroupRank}{' '}
                  <span className="tile-sub">in {currentGroup?.name || 'Group'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Record Callout */}
          {onNavigate && (
            <div className="role-col-footer-action">
              <button
                type="button"
                onClick={() => onNavigate('record')}
                className="role-quick-link-btn"
              >
                <span>Add Soul Winning Record for this Church</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: MIDDLE — THEIR PARENT GROUP TARGETS & STANDINGS */}
        {/* ========================================================================= */}
        <section className="role-col-card">
          <div className="role-col-header">
            <div className="role-col-icon-box icon-emerald">
              <Building2 size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="role-col-header-row">
                <span className="role-col-tag">PARENT GROUP</span>
                <span className="role-count-badge">
                  {currentGroup?.code || 'GROUP'}
                </span>
              </div>
              <h2 className="role-col-title">
                {soulWinnerProfile?.groupName || currentGroup?.name || 'Parent Group'}
              </h2>
            </div>
          </div>

          {/* Parent Group Progress Card */}
          <div className="role-hero-stat-card" style={{ background: 'rgba(255, 255, 255, 0.92)' }}>
            <div className="role-stat-label-row">
              <span className="role-sub-label">GROUP SOULS WON</span>
              <span className="role-status-badge badge-green">
                {groupPercentage}% GROUP TARGET
              </span>
            </div>

            <div className="role-dominant-number" style={{ fontSize: '2.4rem' }}>
              {groupSoulsWon.toLocaleString()}
            </div>

            <div className="role-target-meta-row">
              <div>
                <span className="meta-dim-lbl">GROUP TARGET</span>
                <span className="meta-val">{groupTargetQuota.toLocaleString()} Souls</span>
              </div>
              <div className="meta-divider" />
              <div>
                <span className="meta-dim-lbl">YOUR CONTRIBUTION</span>
                <span className="meta-val text-green">{churchGroupShare}% of Group</span>
              </div>
            </div>

            <div className="role-progress-track">
              <div
                className="role-progress-fill"
                style={{ width: `${Math.min(100, groupPercentage)}%` }}
              />
            </div>
          </div>

          {/* Sibling Churches in Same Group */}
          <div className="sibling-churches-box">
            <div className="sibling-header">
              <span className="sibling-title">CHURCHES IN {currentGroup?.name || 'THIS GROUP'}</span>
              <span className="sibling-count">{siblingChurches.length} Churches</span>
            </div>

            <div className="sibling-list">
              {siblingChurches.map((sibling, idx) => {
                const isThisChurch =
                  sibling.organizationId === (soulWinnerProfile?.churchId || currentChurch?.id);
                return (
                  <div
                    key={sibling.organizationId}
                    className={`sibling-row ${isThisChurch ? 'sibling-current' : ''}`}
                  >
                    <div className="sibling-info">
                      <span className="sibling-rank">#{idx + 1}</span>
                      <span className="sibling-name">
                        {sibling.organizationName}
                        {isThisChurch && <span className="current-ch-tag"> (Your Church)</span>}
                      </span>
                    </div>
                    <div className="sibling-stats">
                      <span className="sibling-won">{sibling.actual.toLocaleString()} souls</span>
                      <span className="sibling-pct">{sibling.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: RIGHT — OVERALL ZONAL TARGETS & STANDINGS */}
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

          {/* Impact Callout */}
          <div className="role-contribution-callout">
            <Sparkles size={20} className="text-gold" />
            <div>
              <span className="contrib-title">EVERY SOUL MATTERS!</span>
              <p className="contrib-desc">
                Your church <strong>{soulWinnerProfile?.churchName || currentChurch?.name}</strong> has
                brought in{' '}
                <span className="text-green font-bold">{churchSoulsWon.toLocaleString()} souls</span> to
                Abuja Zone 1's {(eventConfig.target || 50000).toLocaleString()} harvest goal!
              </p>
            </div>
          </div>

          {/* Quick Race Action */}
          {onNavigate && (
            <div className="role-col-footer-action">
              <button
                type="button"
                onClick={() => onNavigate('race')}
                className="role-quick-link-btn"
              >
                <span>View Full Upward Race (20 Groups)</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
