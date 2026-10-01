import React, { useEffect, useRef, useState } from 'react';
import { useEventConfig } from '../../hooks/useEventConfig';
import { useAuth } from '../../context/AuthContext';
import { fireFullCelebration, playCelebrationSound } from '../../utils/confetti';
import { Trophy, Sparkles, X } from 'lucide-react';
import { subscribeToNationalCounter } from '../../services/counterService';

const CELEBRATED_STORAGE_KEY = 'ron_celebrated_zonal_milestones';

function getCelebratedMilestones(): number[] {
  try {
    const raw = localStorage.getItem(CELEBRATED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveCelebratedMilestones(milestones: number[]): void {
  try {
    localStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify(milestones));
  } catch {
    // ignore
  }
}

export const ConfettiCelebrationOverlay: React.FC = () => {
  const { eventConfig, triggerCelebration } = useEventConfig();
  const { role } = useAuth();
  const isSuperAdmin = role === 'superAdmin';

  const [activeBanner, setActiveBanner] = useState<{
    title: string;
    subtitle?: string;
    badge?: string;
    tag?: string;
    entityName?: string;
    groupName?: string;
    statLine?: string;
  } | null>(null);

  const lastTriggerTimeRef = useRef<number>(Date.now() - 3000);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalSouls, setTotalSouls] = useState<number>(0);

  // Subscribe to live national counter to detect milestone thresholds
  useEffect(() => {
    const unsubscribe = subscribeToNationalCounter(eventConfig.target, (data) => {
      setTotalSouls(data.totalSoulsWon);
    });
    return () => unsubscribe();
  }, [eventConfig.target]);

  const showCelebrationBanner = (data: {
    title: string;
    subtitle?: string;
    badge?: string;
    tag?: string;
    entityName?: string;
    groupName?: string;
    statLine?: string;
  }) => {
    setActiveBanner(data);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setActiveBanner(null);
    }, 8500);
  };

  // 1. LISTEN TO REAL-TIME FIRESTORE BROADCAST TRIGGERS (FROM SUPER ADMIN OR AUTOMATION)
  useEffect(() => {
    const trigger = eventConfig.lastCelebrationTrigger;
    if (!trigger) return;

    if (trigger.timestamp > lastTriggerTimeRef.current) {
      lastTriggerTimeRef.current = trigger.timestamp;

      // Only fire if the trigger happened in the last 20 seconds (avoids replay on stale load)
      if (Date.now() - trigger.timestamp < 20000) {
        fireFullCelebration(7500);
        playCelebrationSound();

        if (trigger.type === 'church_milestone' || trigger.type === 'group_milestone') {
          const badge = trigger.entityType === 'church' ? '🏛️' : '🏆';
          const tag = trigger.entityType === 'church' ? 'CHURCH TARGET MILESTONE' : 'GROUP VICTORY MILESTONE';
          const title = trigger.headline || (trigger.entityName ? `${trigger.entityName.toUpperCase()} CELEBRATION!` : 'SPECIAL MILESTONE!');
          const subtitle = trigger.message || 'Praise God for glorious soul winning increase!';
          const statLine =
            trigger.actual != null && trigger.target != null
              ? `${trigger.actual.toLocaleString()} / ${trigger.target.toLocaleString()} Souls Won (${trigger.percentage || 100}%)`
              : undefined;

          showCelebrationBanner({
            title,
            subtitle,
            badge,
            tag,
            entityName: trigger.entityName,
            groupName: trigger.groupName,
            statLine,
          });
        } else {
          const title = trigger.milestoneValue
            ? `${trigger.milestoneValue.toLocaleString()} SOULS MILESTONE REACHED!`
            : trigger.message || 'SPECIAL ZONAL CELEBRATION!';
          
          const subtitle = trigger.milestoneValue
            ? 'GLORY TO GOD! The harvest continues across Abuja Zone 1!'
            : 'Praise the Lord for extraordinary supernatural victory!';

          showCelebrationBanner({
            title,
            subtitle,
            badge: '👑',
            tag: 'ZONAL MILESTONE CELEBRATION',
          });
        }
      }
    }
  }, [eventConfig.lastCelebrationTrigger]);

  // 2. AUTOMATIC MILESTONE DETECTION WHEN TOTAL SOULS WON REACHES THRESHOLDS
  useEffect(() => {
    if (totalSouls <= 0) return;

    // Determine target milestones: custom list or multiples of milestoneInterval (default 10,000)
    const interval = eventConfig.milestoneInterval && eventConfig.milestoneInterval > 0
      ? eventConfig.milestoneInterval
      : 10000;

    let targetMilestones = eventConfig.zonalMilestones && eventConfig.zonalMilestones.length > 0
      ? [...eventConfig.zonalMilestones]
      : [];

    if (targetMilestones.length === 0) {
      // Generate milestones every interval up to target * 1.5
      const maxTarget = (eventConfig.target || 50000) * 1.5;
      for (let m = interval; m <= maxTarget; m += interval) {
        targetMilestones.push(m);
      }
    }

    const celebrated = getCelebratedMilestones();

    for (const milestone of targetMilestones) {
      if (totalSouls >= milestone && !celebrated.includes(milestone)) {
        // Milestone newly crossed!
        celebrated.push(milestone);
        saveCelebratedMilestones(celebrated);

        fireFullCelebration(7000);
        playCelebrationSound();

        const title = `${milestone.toLocaleString()} SOULS MILESTONE CONQUERED!`;
        const subtitle = `Abuja Zone 1 has officially crossed ${milestone.toLocaleString()} souls won!`;
        showCelebrationBanner({
          title,
          subtitle,
          badge: '🏆',
          tag: 'ZONAL MILESTONE CONQUERED',
        });

        // If Super Admin is currently logged in, broadcast to all other screens in the auditorium
        if (isSuperAdmin) {
          triggerCelebration(title, milestone);
        }
        break;
      }
    }
  }, [totalSouls, eventConfig.zonalMilestones, eventConfig.milestoneInterval, isSuperAdmin, triggerCelebration]);

  if (!activeBanner) return null;

  return (
    <div
      className="celebration-overlay-banner-wrap"
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000000,
        pointerEvents: 'auto',
        maxWidth: '92vw',
        width: '580px',
        animation: 'celebrationSlideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.96) 0%, rgba(5, 46, 22, 0.96) 100%)',
          border: '2px solid rgba(255, 215, 0, 0.85)',
          borderRadius: '20px',
          padding: '18px 24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.45)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backdropFilter: 'blur(16px)',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            flexShrink: 0,
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
          }}
        >
          {activeBanner.badge || <Trophy size={28} color="#000" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '900',
                letterSpacing: '0.14em',
                color: '#FFD700',
                textTransform: 'uppercase',
                fontFamily: "'Orbitron', sans-serif",
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={13} /> {activeBanner.tag || 'ZONAL MILESTONE CELEBRATION'}
            </span>

            {activeBanner.groupName && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                }}
              >
                {activeBanner.groupName}
              </span>
            )}
          </div>

          <h3
            style={{
              margin: '4px 0 2px 0',
              fontSize: '1.18rem',
              fontWeight: '900',
              fontFamily: "'Orbitron', sans-serif",
              color: '#ffffff',
              letterSpacing: '0.02em',
              lineHeight: 1.25,
            }}
          >
            {activeBanner.title}
          </h3>

          {activeBanner.statLine && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(0, 255, 135, 0.4)',
                borderRadius: '8px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#00ff87',
                margin: '2px 0',
              }}
            >
              <span>{activeBanner.statLine}</span>
            </div>
          )}

          {activeBanner.subtitle && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '0.84rem',
                color: 'rgba(255, 255, 255, 0.92)',
                fontWeight: '500',
                lineHeight: 1.35,
              }}
            >
              {activeBanner.subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setActiveBanner(null)}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>

      <style>{`
        @keyframes celebrationSlideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -30px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
