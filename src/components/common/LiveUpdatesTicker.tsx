import React, { useState, useEffect, useMemo } from 'react';
import { Pause, Play, Bell, Clock, Trophy, Church as ChurchIcon, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useEventConfig } from '../../hooks/useEventConfig';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { getGroups, getChurches } from '../../services/organizationService';
import { getTargets } from '../../services/targetService';
import { calculateGroupRaceProgress, calculateChurchRaceProgress } from '../../services/targetProgressEngine';
import type { OrganizationProgress } from '../../types/target';

interface TickerItem {
  id: string;
  type: 'announcement' | 'countdown' | 'milestone' | 'group' | 'church';
  badge: string;
  badgeColor: string;
  text: string;
  highlight?: string;
  icon?: 'bell' | 'clock' | 'trophy' | 'church' | 'layers';
}

interface LiveUpdatesTickerProps {
  /** If in full-screen modal mode */
  isBigScreen?: boolean;
  /** Whether desktop sidebar is collapsed */
  isSidebarCollapsed?: boolean;
}

export const LiveUpdatesTicker: React.FC<LiveUpdatesTickerProps> = ({
  isBigScreen = false,
  isSidebarCollapsed = false,
}) => {
  const { eventConfig } = useEventConfig();
  const [recordsCount, setRecordsCount] = useState<number>(0);
  const [topGroups, setTopGroups] = useState<OrganizationProgress[]>([]);
  const [activeChurches, setActiveChurches] = useState<OrganizationProgress[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<'normal' | 'fast'>('normal');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Clock tick every 10 seconds for real-time countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Poll database every 12 seconds for fresh field records
  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const [records, groups, churches, targets] = await Promise.all([
          getAllLocalRecords(),
          getGroups(),
          getChurches(),
          getTargets(),
        ]);

        if (!isMounted) return;

        setRecordsCount(records.length);

        const groupProgress = calculateGroupRaceProgress(records, groups, targets);
        setTopGroups(groupProgress);

        const churchProgress = calculateChurchRaceProgress(records, churches, targets);
        // Churches with souls won, or top targets
        const churchesWithSouls = churchProgress.filter((c) => c.actual > 0);
        setActiveChurches(churchesWithSouls.length > 0 ? churchesWithSouls : churchProgress.slice(0, 8));
      } catch (err) {
        console.error('Failed to load ticker data:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Build the list of ticker items
  const tickerItems = useMemo<TickerItem[]>(() => {
    const items: TickerItem[] = [];

    // 1. TIME TO GO & HOURLY PULSE COUNTDOWN
    const targetDateStr =
      eventConfig.countdownTargetTime ||
      eventConfig.scheduledStartAt ||
      (eventConfig.startAt && eventConfig.status === 'upcoming' ? eventConfig.startAt : `${eventConfig.eventDate}T09:00:00+01:00`);
    const parsedTargetTime = new Date(targetDateStr).getTime();
    const targetTimestamp = isNaN(parsedTargetTime) ? new Date(`${eventConfig.eventDate}T09:00:00+01:00`).getTime() : parsedTargetTime;
    const diffMs = targetTimestamp - currentTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (eventConfig.status === 'upcoming') {
      if (diffMs > 0) {
        const timeStr = diffDays > 0 
          ? `${diffDays} Day${diffDays > 1 ? 's' : ''}, ${Math.abs(diffHours % 24)} Hours`
          : `${Math.max(0, diffHours)} Hours ${Math.max(0, diffMins)} Mins`;

        items.push({
          id: 'countdown-main',
          type: 'countdown',
          badge: 'TIME TO GO',
          badgeColor: '#0ea5e9',
          text: `Reach Out Nigeria 2026 kicks off in ${timeStr}! Abuja Zone 1 preparing 127 Churches across 24 Groups.`,
          highlight: timeStr,
          icon: 'clock',
        });

        items.push({
          id: 'countdown-hourly',
          type: 'countdown',
          badge: 'HOURLY PULSE',
          badgeColor: '#38bdf8',
          text: `Countdown Active: T-Minus ${Math.max(0, diffHours)} Hours until Campaign Launch. Prepare the field!`,
          highlight: `T-Minus ${Math.max(0, diffHours)} Hours`,
          icon: 'clock',
        });
      } else {
        items.push({
          id: 'countdown-imminent',
          type: 'countdown',
          badge: 'LIVE IMMINENT',
          badgeColor: '#f59e0b',
          text: `Reach Out Nigeria Day has arrived! Zone launching live into the field across all 24 Groups!`,
          icon: 'clock',
        });
      }
    } else if (eventConfig.status === 'live') {
      items.push({
        id: 'countdown-live',
        type: 'countdown',
        badge: 'CAMPAIGN LIVE',
        badgeColor: '#ef4444',
        text: `REACH OUT NIGERIA IS LIVE! Abuja Zone 1 recording souls in real-time across all 127 Churches!`,
        highlight: 'LIVE NOW',
        icon: 'clock',
      });
      // Hourly marker during live
      const currentHour = currentTime.getHours();
      items.push({
        id: 'countdown-live-hour',
        type: 'countdown',
        badge: 'HOURLY TALLY',
        badgeColor: '#f59e0b',
        text: `Hour ${currentHour}:00 Update: ${recordsCount.toLocaleString()} / ${eventConfig.target.toLocaleString()} souls registered zone-wide!`,
        highlight: `${recordsCount.toLocaleString()} Souls`,
        icon: 'clock',
      });
    } else {
      items.push({
        id: 'countdown-done',
        type: 'countdown',
        badge: 'CAMPAIGN COMPLETE',
        badgeColor: '#10b981',
        text: `Campaign Completed! Final tally: ${recordsCount.toLocaleString()} souls won for the Kingdom!`,
        highlight: `${recordsCount.toLocaleString()} Souls`,
        icon: 'trophy',
      });
    }

    // 2. OFFICIAL ANNOUNCEMENTS
    const announcements = eventConfig.announcements && eventConfig.announcements.length > 0
      ? eventConfig.announcements
      : [
          '📢 REACH OUT NIGERIA 2026: Every soul counts! Keep recording harvest results across all 24 Groups & Churches!',
          '⚡ ZONAL VICTORY MANDATE: 50,000 Souls targeted for the Master\'s Kingdom in Abuja Zone 1!',
          '🔥 CELL LEADERS & COORDINATORS: Verify and sync all field counts as soon as outreaches conclude.',
        ];

    announcements.forEach((ann, idx) => {
      items.push({
        id: `announcement-${idx}`,
        type: 'announcement',
        badge: 'ANNOUNCEMENT',
        badgeColor: '#f5b700',
        text: ann,
        icon: 'bell',
      });
    });

    // 3. MILESTONE ALERTS
    const target = eventConfig.target || 50000;
    const zonalPercentage = Math.round(((recordsCount / target) * 100) * 10) / 10;
    const milestones = eventConfig.milestones || [];

    // Find highest reached milestone
    const reachedMilestones = milestones.filter((m) => zonalPercentage >= m.percentage);
    const nextMilestone = milestones.find((m) => zonalPercentage < m.percentage);

    if (reachedMilestones.length > 0) {
      const topMilestone = reachedMilestones[reachedMilestones.length - 1];
      items.push({
        id: 'milestone-reached',
        type: 'milestone',
        badge: 'MILESTONE UNLOCKED',
        badgeColor: '#8b5cf6',
        text: `${topMilestone.badge || '⭐'} Abuja Zone 1 has achieved the ${topMilestone.label} Milestone (${topMilestone.percentage}% Target reached with ${recordsCount.toLocaleString()} souls)!`,
        highlight: `${topMilestone.label} (${topMilestone.percentage}%)`,
        icon: 'trophy',
      });
    }

    if (nextMilestone) {
      items.push({
        id: 'milestone-next',
        type: 'milestone',
        badge: 'NEXT MILESTONE',
        badgeColor: '#a855f7',
        text: `Next Zonal Target: ${nextMilestone.label} at ${nextMilestone.percentage}% (${Math.round((nextMilestone.percentage / 100) * target).toLocaleString()} Souls). Currently at ${zonalPercentage}%!`,
        highlight: `${nextMilestone.percentage}% Target`,
        icon: 'trophy',
      });
    }

    // 4. GROUP LEVEL UPDATES & RACE STANDINGS
    if (topGroups.length > 0) {
      // Top 3 Groups
      const leader = topGroups[0];
      if (leader && leader.actual > 0) {
        items.push({
          id: 'group-leader',
          type: 'group',
          badge: 'GROUP LEADER',
          badgeColor: '#008751',
          text: `👑 #1 Position in Upward Race: ${leader.organizationName} leading with ${leader.actual.toLocaleString()} souls won (${leader.displayPercentage} of target)!`,
          highlight: leader.organizationName,
          icon: 'layers',
        });
      }

      // Top 3 summary
      const top3 = topGroups.slice(0, 3).filter((g) => g.actual > 0);
      if (top3.length >= 2) {
        const top3Text = top3.map((g, i) => `#${i + 1} ${g.organizationName} (${g.actual.toLocaleString()})`).join(' • ');
        items.push({
          id: 'group-top3',
          type: 'group',
          badge: 'TOP GROUPS',
          badgeColor: '#10b981',
          text: `Current Leaders: ${top3Text}`,
          icon: 'layers',
        });
      }

      // Group quota milestones
      topGroups.forEach((grp) => {
        if (grp.percentage >= 100) {
          items.push({
            id: `grp-100-${grp.organizationId}`,
            type: 'group',
            badge: '100% QUOTA SMASHED',
            badgeColor: '#f59e0b',
            text: `🔥 VICTORY: ${grp.organizationName} has achieved 100% of its campaign target (${grp.actual.toLocaleString()} / ${grp.target.toLocaleString()} souls)!`,
            highlight: grp.organizationName,
            icon: 'trophy',
          });
        }
      });

      // Default Group presence if early
      if (recordsCount === 0) {
        items.push({
          id: 'group-ready',
          type: 'group',
          badge: '24 GROUPS COMPETING',
          badgeColor: '#008751',
          text: `All 24 Groups in Abuja Zone 1 are activated and ready for Reach Out Nigeria Upward Race!`,
          icon: 'layers',
        });
      }
    }

    // 5. CHURCH LEVEL UPDATES
    if (activeChurches.length > 0) {
      const churchesWithSouls = activeChurches.filter((c) => c.actual > 0);

      if (churchesWithSouls.length > 0) {
        // Top Church
        const topChurch = churchesWithSouls[0];
        items.push({
          id: 'church-leader',
          type: 'church',
          badge: 'TOP CHURCH',
          badgeColor: '#059669',
          text: `⭐ Church Standings Leader: ${topChurch.organizationName} with ${topChurch.actual.toLocaleString()} souls won (${topChurch.displayPercentage})!`,
          highlight: topChurch.organizationName,
          icon: 'church',
        });

        // Other active churches
        churchesWithSouls.slice(1, 4).forEach((ch) => {
          items.push({
            id: `church-act-${ch.organizationId}`,
            type: 'church',
            badge: 'CHURCH UPDATE',
            badgeColor: '#10b981',
            text: `${ch.organizationName}: ${ch.actual.toLocaleString()} souls recorded (${ch.displayPercentage} of ${ch.target} target).`,
            icon: 'church',
          });
        });
      } else {
        items.push({
          id: 'church-ready-all',
          type: 'church',
          badge: '127 CHURCHES READY',
          badgeColor: '#059669',
          text: `127 Churches in Abuja Zone 1 primed for field recording across all 24 Groups.`,
          icon: 'church',
        });
      }
    }

    return items;
  }, [eventConfig, recordsCount, topGroups, activeChurches, currentTime]);

  if (tickerItems.length === 0) return null;

  // Render icon based on item
  const renderItemIcon = (icon?: string) => {
    switch (icon) {
      case 'bell':
        return <Bell size={13} style={{ flexShrink: 0 }} />;
      case 'clock':
        return <Clock size={13} style={{ flexShrink: 0 }} />;
      case 'trophy':
        return <Trophy size={13} style={{ flexShrink: 0 }} />;
      case 'church':
        return <ChurchIcon size={13} style={{ flexShrink: 0 }} />;
      case 'layers':
      default:
        return <Layers size={13} style={{ flexShrink: 0 }} />;
    }
  };

  // If collapsed on mobile or by user preference
  if (isCollapsed) {
    return (
      <div
        className="ticker-collapsed-pill"
        style={{
          position: 'fixed',
          bottom: isBigScreen ? '16px' : '20px',
          right: '16px',
          zIndex: isBigScreen ? 10006 : 95,
          background: 'rgba(7, 23, 16, 0.95)',
          border: '1px solid rgba(0, 255, 135, 0.3)',
          borderRadius: '30px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
        }}
        onClick={() => setIsCollapsed(false)}
        title="Expand Live Updates Ticker"
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
          }}
          className="animate-pulse"
        />
        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.05em' }}>
          LIVE UPDATES ({tickerItems.length})
        </span>
        <ChevronUp size={14} color="#00ff87" />
      </div>
    );
  }

  const animationDuration = scrollSpeed === 'fast' ? `${tickerItems.length * 7}s` : `${tickerItems.length * 12}s`;

  return (
    <div
      className={`live-ticker-container ${isBigScreen ? 'ticker-bigscreen' : ''} ${isSidebarCollapsed ? 'ticker-sidebar-collapsed' : ''}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: isBigScreen ? 0 : isSidebarCollapsed ? '72px' : '260px',
        right: 0,
        zIndex: isBigScreen ? 10005 : 90,
        background: 'linear-gradient(90deg, #04120b 0%, #071e13 50%, #04120b 100%)',
        borderTop: '2px solid rgba(0, 255, 135, 0.35)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.45)',
        height: isBigScreen ? '46px' : '40px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* LEFT BADGE: LIVE UPDATES / PULSE BEACON */}
      <div
        style={{
          background: 'linear-gradient(135deg, #008751 0%, #005a36 100%)',
          color: '#ffffff',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: isBigScreen ? '0 18px' : '0 12px',
          fontWeight: '900',
          fontSize: isBigScreen ? '0.82rem' : '0.74rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flexShrink: 0,
          boxShadow: '4px 0 14px rgba(0, 0, 0, 0.4)',
          zIndex: 2,
          borderRight: '1px solid rgba(255, 215, 0, 0.4)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ff4d4d',
            boxShadow: '0 0 10px #ff4d4d',
          }}
          className="animate-pulse"
        />
        <span>LIVE UPDATES</span>
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            marginLeft: '4px',
          }}
          title={isPaused ? 'Resume scrolling' : 'Pause ticker'}
        >
          {isPaused ? <Play size={11} fill="#ffffff" /> : <Pause size={11} fill="#ffffff" />}
        </button>
      </div>

      {/* MARQUEE TRACK (DUPLICATED FOR SEAMLESS 100% INFINITE LOOP) */}
      <div
        className="ticker-viewport"
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          maskImage: 'linear-gradient(to right, transparent, black 20px, black 95%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black 95%, transparent)',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="ticker-track"
          style={{
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            animation: `ronTickerScroll ${animationDuration} linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            willChange: 'transform',
          }}
        >
          {/* Primary stream */}
          {tickerItems.map((item, idx) => (
            <div
              key={`ticker-p-${item.id}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 24px',
                fontSize: isBigScreen ? '0.88rem' : '0.80rem',
                color: '#e2e8f0',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span
                style={{
                  background: item.badgeColor,
                  color: '#ffffff',
                  fontSize: '0.64rem',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                {renderItemIcon(item.icon)}
                <span>{item.badge}</span>
              </span>
              <span style={{ fontWeight: '500' }}>
                {item.highlight ? (
                  <>
                    {item.text.split(item.highlight)[0]}
                    <strong style={{ color: '#FFD700', fontWeight: '800' }}>{item.highlight}</strong>
                    {item.text.split(item.highlight)[1]}
                  </>
                ) : (
                  item.text
                )}
              </span>
              <span style={{ color: 'rgba(0, 255, 135, 0.6)', fontWeight: '900', margin: '0 4px' }}>•</span>
            </div>
          ))}

          {/* Seamless duplicate stream */}
          {tickerItems.map((item, idx) => (
            <div
              key={`ticker-d-${item.id}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 24px',
                fontSize: isBigScreen ? '0.88rem' : '0.80rem',
                color: '#e2e8f0',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span
                style={{
                  background: item.badgeColor,
                  color: '#ffffff',
                  fontSize: '0.64rem',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                {renderItemIcon(item.icon)}
                <span>{item.badge}</span>
              </span>
              <span style={{ fontWeight: '500' }}>
                {item.highlight ? (
                  <>
                    {item.text.split(item.highlight)[0]}
                    <strong style={{ color: '#FFD700', fontWeight: '800' }}>{item.highlight}</strong>
                    {item.text.split(item.highlight)[1]}
                  </>
                ) : (
                  item.text
                )}
              </span>
              <span style={{ color: 'rgba(0, 255, 135, 0.6)', fontWeight: '900', margin: '0 4px' }}>•</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT CONTROLS: SPEED & MINIMIZE */}
      <div
        style={{
          background: 'rgba(4, 18, 11, 0.95)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 10px',
          flexShrink: 0,
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 2,
        }}
      >
        <button
          type="button"
          onClick={() => setScrollSpeed(scrollSpeed === 'normal' ? 'fast' : 'normal')}
          style={{
            background: scrollSpeed === 'fast' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${scrollSpeed === 'fast' ? '#FFD700' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '4px',
            color: scrollSpeed === 'fast' ? '#FFD700' : '#94a3b8',
            fontSize: '0.65rem',
            fontWeight: '700',
            padding: '2px 6px',
            cursor: 'pointer',
          }}
          title="Toggle scroll speed"
        >
          {scrollSpeed === 'fast' ? '1.5x' : '1x'}
        </button>

        {!isBigScreen && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
            title="Minimize ticker"
          >
            <ChevronDown size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
