import React, { useState, useEffect } from 'react';
import { CheckCircle2, Tv, Sparkles } from 'lucide-react';
import { FlipCounterDisplay } from './FlipCounterDisplay';
import { UpwardRaceVisualization } from './UpwardRaceVisualization';
import { BigScreenDisplayModal } from './BigScreenDisplayModal';
import { AppleProgressRingsWidget } from './AppleProgressRingsWidget';
import { GroupHomeView } from '../home/GroupHomeView';
import { ChurchHomeView } from '../home/ChurchHomeView';
import { subscribeToNationalCounter, type ZonalCounterData } from '../../services/counterService';
import { useEventConfig } from '../../hooks/useEventConfig';
import { useAuth } from '../../context/AuthContext';

interface PublicHomeViewProps {
  onNavigate?: (tab: 'home' | 'record' | 'account' | 'org' | 'race' | 'dashboard') => void;
  onOpenAuth?: () => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { eventConfig, isLive, isCompleted, triggerCelebration } = useEventConfig();
  const { soulWinnerProfile, isAuthenticated, role } = useAuth();
  const [isDisplayModeOpen, setIsDisplayModeOpen] = useState<boolean>(false);
  const [isTriggeringConfetti, setIsTriggeringConfetti] = useState<boolean>(false);

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

  // Observer Mode: Unauthenticated guest viewer
  const isObserverMode = !isAuthenticated || !role;

  // 1. Group Role: Render 3-section Group Home View
  if (role === 'groupManager') {
    return <GroupHomeView onNavigate={onNavigate} onOpenAuth={onOpenAuth} />;
  }

  // 2. Church / Leader / Soul Winner Role: Render 3-section Church Home View
  if (role === 'churchManager' || role === 'soulWinner') {
    return <ChurchHomeView onNavigate={onNavigate} onOpenAuth={onOpenAuth} />;
  }

  // 3. Super Admin, Zone Manager, and Observer Mode: Public / Zonal Overview
  return (
    <div className="public-home-container">
      {/* EVENT IDENTITY SUBHEADER */}
      <div className="event-date-row">
        <div className="date-tag-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/reachout_world_nigeria_logo.png"
            alt="ReachOut World Nigeria Logo"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
          <span>CEAZ1 REACHOUT NIGERIA SOUL WINNING CAMPAIGN</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick Confetti Trigger for Super Admin */}
          {role === 'superAdmin' && (
            <button
              type="button"
              onClick={async () => {
                setIsTriggeringConfetti(true);
                try {
                  await triggerCelebration('SUPER ADMIN LIVE CELEBRATION!');
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsTriggeringConfetti(false);
                }
              }}
              disabled={isTriggeringConfetti}
              style={{
                background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)',
                border: '1.5px solid #FFD700',
                borderRadius: '8px',
                padding: '6px 14px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isTriggeringConfetti ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 12px rgba(255, 215, 0, 0.35)',
              }}
              title="Broadcast Confetti to all screens"
            >
              <Sparkles size={14} style={{ color: '#FFD700' }} />
              <span>{isTriggeringConfetti ? 'BROADCASTING...' : '🎉 FIRE CONFETTI'}</span>
            </button>
          )}

          {/* Big Screen Button: Accessible to everyone */}
          <button
            type="button"
            onClick={() => setIsDisplayModeOpen(true)}
            className="display-mode-trigger-btn"
            title="Open Big-Screen / TV Display Mode"
          >
            <Tv size={15} />
            <span>BIG SCREEN MODE</span>
          </button>
        </div>
      </div>

      {/* DOMINANT DIGITAL LED COUNTER HERO */}
      <section className="counter-hero-section">
        <div className="counter-hero-header">
          <h2 className="souls-won-label">
            {isCompleted ? 'FINAL ZONAL SOULS WON' : 'ZONAL SOULS WON'}
          </h2>

          <div className="live-status-pill">
            {isLive && (
              <span className="pill-status-text live-badge">
                <span className="live-dot" /> LIVE
              </span>
            )}
            {isCompleted && (
              <span className="pill-status-text completed-badge">
                <CheckCircle2 size={14} /> EVENT COMPLETED
              </span>
            )}
          </div>
        </div>

        {/* Digital 7-Segment Digit Counter */}
        <FlipCounterDisplay value={counterData.totalSoulsWon} />

        {/* Target & Percentage Readout */}
        <div className="target-readout-row">
          <div className="target-stat">
            <span className="stat-label">ZONAL TARGET</span>
            <span className="stat-value">{counterData.zonalTarget.toLocaleString()} SOULS</span>
          </div>

          <div className="target-divider" />

          <div className="target-stat">
            <span className="stat-label">
              {isCompleted ? 'FINAL % OF ZONAL TARGET' : '% OF ZONAL TARGET'}
            </span>
            <span className="stat-value stat-green">{counterData.percentageAchieved}%</span>
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="zonal-progress-track">
          <div
            className="zonal-progress-fill"
            style={{ width: `${Math.min(100, counterData.percentageAchieved)}%` }}
          />
        </div>
      </section>

      {/* TOP 5 GROUPS CIRCULAR PROGRESS RINGS (APPLE WIDGET STYLE) */}
      <AppleProgressRingsWidget
        groups={counterData.groupCompetitors}
        onViewAll={() => {
          if (onNavigate) {
            onNavigate('race');
          } else {
            const raceSec = document.querySelector('.upward-race-section');
            if (raceSec) raceSec.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* UPWARD RACE VISUALIZATION (BAR CHART VARIANT ON HOME SCREEN WITH GROUP HIGHLIGHT) */}
      <section className="upward-race-section">
        <UpwardRaceVisualization
          competitors={counterData.groupCompetitors}
          variant="barChart"
          highlightGroupId={soulWinnerProfile?.groupId}
          highlightGroupName={soulWinnerProfile?.groupName}
        />
      </section>

      {/* BIG SCREEN / TV DISPLAY MODE MODAL (Only when triggered in Observer Mode) */}
      {isObserverMode && (
        <BigScreenDisplayModal
          isOpen={isDisplayModeOpen}
          onClose={() => setIsDisplayModeOpen(false)}
          counterData={counterData}
          eventStatus={eventConfig.status}
        />
      )}
    </div>
  );
};
