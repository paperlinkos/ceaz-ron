import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  CheckCircle2,
  Calendar,
  Clock,
  Activity,
  Users,
  Building2,
  AlertTriangle,
  History,
  TrendingUp,
  RotateCcw,
  PartyPopper,
  Sparkles,
  Timer,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useEventConfig } from '../../hooks/useEventConfig';
import { getEventAuditLogs } from '../../services/eventService';
import type { EventAuditLog, EventStatus } from '../../config/eventConfig';
import { UpwardRaceVisualization } from '../public/UpwardRaceVisualization';
import {
  subscribeToNationalCounter,
  purgeAllSoulWinningRecords,
  type ZonalCounterData,
} from '../../services/counterService';
import { getZones, getGroups, getChurches } from '../../services/organizationService';
import { MilestoneCelebrationManager } from './MilestoneCelebrationManager';

export const EventControlView: React.FC = () => {
  const { eventConfig, isUpcoming, isLive, isCompleted, changeStatus, saveSettings, triggerCelebration } = useEventConfig();
  const [isTriggeringConfetti, setIsTriggeringConfetti] = useState<boolean>(false);
  const [confettiSuccessMessage, setConfettiSuccessMessage] = useState<string | null>(null);
  const [isTogglingTimer, setIsTogglingTimer] = useState<boolean>(false);
  const [timerFeedback, setTimerFeedback] = useState<string | null>(null);
  const currentInterval = eventConfig.milestoneInterval || 10000;

  const isTimerEnabled = eventConfig.countdownTimerEnabled !== false;

  const handleToggleCountdownTimer = async () => {
    setIsTogglingTimer(true);
    try {
      const nextState = !isTimerEnabled;
      const ok = await saveSettings({ countdownTimerEnabled: nextState });
      if (ok) {
        setTimerFeedback(
          nextState
            ? 'Launch countdown timer is now ACTIVE and visible across all screens.'
            : 'Launch countdown timer has been DISABLED and hidden from all screens.'
        );
        setTimeout(() => setTimerFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Failed to toggle countdown timer:', err);
    } finally {
      setIsTogglingTimer(false);
    }
  };

  const [counterData, setCounterData] = useState<ZonalCounterData>({
    totalSoulsWon: 0,
    zonalTarget: eventConfig.target,
    nationalTarget: eventConfig.target,
    percentageAchieved: 0,
    groupCompetitors: [],
    groupProgresses: [],
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetStatus: EventStatus | null;
  }>({ isOpen: false, targetStatus: null });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<EventAuditLog[]>([]);
  const [counts, setCounts] = useState<{
    zones: number;
    groups: number;
    churches: number;
    soulWinners: number;
  }>({ zones: 0, groups: 0, churches: 0, soulWinners: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToNationalCounter(eventConfig.target, (data) =>
      setCounterData(data)
    );
    return () => unsubscribe();
  }, [eventConfig.target]);

  const loadAuditLogsAndCounts = async () => {
    const logs = await getEventAuditLogs();
    setAuditLogs(logs);

    try {
      const [z, g, c] = await Promise.all([getZones(), getGroups(), getChurches()]);

      setCounts({
        zones: z.length,
        groups: g.length,
        churches: c.length,
        soulWinners: counterData.groupCompetitors.reduce(
          (acc: number, item: any) => acc + (item.soulsWon > 0 ? 1 : 0),
          0
        ),
      });
    } catch (err) {
      console.warn('Error loading operational counts:', err);
    }
  };

  useEffect(() => {
    loadAuditLogsAndCounts();
  }, [counterData.totalSoulsWon]);

  const handleOpenConfirm = (targetStatus: EventStatus) => {
    setConfirmModal({ isOpen: true, targetStatus });
  };

  const handleExecuteStatusChange = async () => {
    if (!confirmModal.targetStatus) return;
    setIsProcessing(true);

    try {
      const success = await changeStatus(confirmModal.targetStatus);
      if (success) {
        setConfirmModal({ isOpen: false, targetStatus: null });
        await loadAuditLogsAndCounts();
      }
    } catch (err) {
      console.error('Error changing event status:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeSouls = async () => {
    setIsProcessing(true);
    try {
      const deletedCount = await purgeAllSoulWinningRecords('superAdmin');
      setResetModalOpen(false);
      setResetSuccessMessage(
        `Successfully reset soul counter to 0 (${deletedCount} server & local records cleared).`
      );
      setTimeout(() => setResetSuccessMessage(null), 5000);
      await loadAuditLogsAndCounts();
    } catch (err) {
      console.error('Error resetting souls:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerConfetti = async () => {
    setIsTriggeringConfetti(true);
    try {
      await triggerCelebration('SUPER ADMIN LIVE CELEBRATION!');
      setConfettiSuccessMessage('🎉 Confetti Celebration broadcast to all screens in real-time!');
      setTimeout(() => setConfettiSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to trigger celebration:', err);
    } finally {
      setIsTriggeringConfetti(false);
    }
  };

  const handleSetInterval = async (interval: number) => {
    try {
      const maxTarget = (eventConfig.target || 50000) * 1.5;
      const newMilestones: number[] = [];
      for (let m = interval; m <= maxTarget; m += interval) {
        newMilestones.push(m);
      }
      await saveSettings({
        milestoneInterval: interval,
        zonalMilestones: newMilestones,
      });
      setConfettiSuccessMessage(`Saved Zonal Milestones: Celebration every ${interval.toLocaleString()} Souls.`);
      setTimeout(() => setConfettiSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update milestone interval:', err);
    }
  };

  const handleResetCelebratedTracker = () => {
    localStorage.removeItem('ron_celebrated_zonal_milestones');
    setConfettiSuccessMessage('Celebrated milestones tracker reset. Automatic celebrations can trigger again.');
    setTimeout(() => setConfettiSuccessMessage(null), 4000);
  };

  const formattedStart = eventConfig.startAt
    ? new Date(eventConfig.startAt).toLocaleString()
    : 'Not Started';

  const formattedEnd = eventConfig.endAt
    ? new Date(eventConfig.endAt).toLocaleString()
    : 'Not Ended';

  return (
    <div className="event-control-container">
      {/* 1. EVENT STATUS CONTROL HERO CARD */}
      <div className="event-control-hero-card">
        <div className="control-hero-top">
          <div className="hero-title-group">
            <h2 className="control-hero-title">EVENT CONTROL & COMMAND CENTER</h2>
            <p className="control-hero-subtitle">
              Operational control and real-time monitoring for Reach Out Nigeria campaign.
            </p>
          </div>

          <div className="status-badge-container">
            {isUpcoming && (
              <span className="event-status-pill pill-upcoming">
                <Clock size={14} /> UPCOMING
              </span>
            )}
            {isLive && (
              <span className="event-status-pill pill-live">
                <span className="live-dot-pulse" /> ● LIVE
              </span>
            )}
            {isCompleted && (
              <span className="event-status-pill pill-completed">
                <CheckCircle2 size={14} /> EVENT COMPLETED
              </span>
            )}
          </div>
        </div>

        {/* METRICS SUMMARY GRID */}
        <div className="event-config-grid">
          <div className="config-metric-item">
            <span className="config-label">EVENT DATE</span>
            <div className="config-value-row">
              <Calendar size={18} className="icon-green" />
              <span className="config-value">{eventConfig.eventDate}</span>
            </div>
          </div>

          <div className="config-metric-item">
            <span className="config-label">ZONAL TARGET</span>
            <div className="config-value-row">
              <span className="config-value">{eventConfig.target.toLocaleString()} SOULS</span>
            </div>
          </div>

          <div className="config-metric-item">
            <span className="config-label">START TIME</span>
            <div className="config-value-row">
              <Clock size={16} />
              <span className="config-subvalue">{formattedStart}</span>
            </div>
          </div>

          <div className="config-metric-item">
            <span className="config-label">END TIME</span>
            <div className="config-value-row">
              <Clock size={16} />
              <span className="config-subvalue">{formattedEnd}</span>
            </div>
          </div>
        </div>

        {/* CONTROLLED ACTION BUTTONS */}
        <div className="control-actions-bar">
          <div className="control-actions-main">
            {isUpcoming && (
              <button
                onClick={() => handleOpenConfirm('live')}
                className="submit-button btn-start-event"
              >
                <Play size={20} />
                <span>START EVENT</span>
              </button>
            )}

            {isLive && (
              <button
                onClick={() => handleOpenConfirm('completed')}
                className="danger-button btn-end-event"
              >
                <Square size={20} />
                <span>END EVENT</span>
              </button>
            )}

            {isCompleted && (
              <div className="completed-summary-pill">
                <CheckCircle2 size={18} />
                <span>EVENT COMPLETED — FINAL TOTALS PRESERVED</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="btn-reset-souls"
            title="Reset Souls Count to Zero"
            disabled={isProcessing}
          >
            <RotateCcw size={16} />
            <span>RESET SOULS TO ZERO</span>
          </button>
        </div>

        {resetSuccessMessage && (
          <div className="reset-feedback-banner">
            <CheckCircle2 size={16} />
            <span>{resetSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* CAMPAIGN COUNTDOWN TIMER FEATURE SWITCH */}
      <div
        className="event-section-card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(13, 38, 27, 0.65) 100%)',
          border: '1.5px solid rgba(0, 135, 81, 0.3)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '680px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isTimerEnabled ? 'rgba(0, 135, 81, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                border: isTimerEnabled ? '1.5px solid #008751' : '1.5px solid rgba(148, 163, 184, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isTimerEnabled ? '#00e676' : '#94a3b8',
                flexShrink: 0,
              }}
            >
              <Timer size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  CAMPAIGN LAUNCH COUNTDOWN TIMER
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '14px',
                    background: isTimerEnabled ? 'rgba(0, 135, 81, 0.25)' : 'rgba(100, 116, 139, 0.2)',
                    color: isTimerEnabled ? '#00e676' : '#94a3b8',
                    border: isTimerEnabled ? '1px solid #008751' : '1px solid #64748b',
                    letterSpacing: '0.06em',
                  }}
                >
                  {isTimerEnabled ? '● ACTIVE & VISIBLE' : '○ DISABLED & HIDDEN'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Controls the countdown timer banner on the <strong>Home Screen</strong> and in <strong>Big Screen / TV Mode</strong>. When turned off, the countdown is instantly hidden everywhere.
              </p>
            </div>
          </div>

          {/* TOGGLE SWITCH BUTTON */}
          <button
            type="button"
            onClick={handleToggleCountdownTimer}
            disabled={isTogglingTimer}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: isTimerEnabled
                ? 'linear-gradient(135deg, #008751 0%, #00b36b 100%)'
                : 'rgba(51, 65, 85, 0.6)',
              border: isTimerEnabled ? '1.5px solid #00e676' : '1.5px solid #64748b',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: isTogglingTimer ? 'not-allowed' : 'pointer',
              boxShadow: isTimerEnabled ? '0 4px 16px rgba(0, 135, 81, 0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isTimerEnabled ? <ToggleRight size={22} style={{ color: '#ffffff' }} /> : <ToggleLeft size={22} style={{ color: '#94a3b8' }} />}
            <span>{isTimerEnabled ? 'TIMER ENABLED (CLICK TO TURN OFF)' : 'TIMER DISABLED (CLICK TO TURN ON)'}</span>
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {timerFeedback && (
          <div
            style={{
              marginTop: '14px',
              background: isTimerEnabled ? 'rgba(0, 135, 81, 0.2)' : 'rgba(217, 119, 6, 0.15)',
              border: isTimerEnabled ? '1px solid rgba(0, 255, 135, 0.4)' : '1px solid rgba(217, 119, 6, 0.4)',
              borderRadius: '8px',
              padding: '8px 14px',
              color: isTimerEnabled ? '#00ff87' : '#fbbf24',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={15} />
            <span>{timerFeedback}</span>
          </div>
        )}
      </div>

      {/* SMART CHURCH & GROUP MILESTONE CELEBRATION COMMAND CENTER */}
      <MilestoneCelebrationManager />

      {/* 2. ZONAL MILESTONES & LIVE CONFETTI CELEBRATIONS PANEL */}
      <div
        className="event-section-card"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.08) 0%, rgba(15, 23, 42, 0.45) 100%)',
          border: '1.5px solid rgba(0, 135, 81, 0.28)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PartyPopper size={24} style={{ color: '#FFD700' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                ZONAL MILESTONES & REAL-TIME CELEBRATIONS
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Full-screen confetti automatically bursts every 10k souls, or tap below to trigger on-demand for the hall.
              </p>
            </div>
          </div>

          {/* REAL-TIME MANUAL CONFETTI TRIGGER BUTTON */}
          <button
            type="button"
            onClick={handleTriggerConfetti}
            disabled={isTriggeringConfetti}
            style={{
              background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)',
              border: '1.5px solid #FFD700',
              borderRadius: '12px',
              padding: '10px 20px',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isTriggeringConfetti ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(0, 135, 81, 0.4), 0 0 15px rgba(255, 215, 0, 0.3)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <Sparkles size={18} style={{ color: '#FFD700' }} />
            <span>{isTriggeringConfetti ? 'BROADCASTING...' : '🎉 FIRE CONFETTI CELEBRATION NOW'}</span>
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {confettiSuccessMessage && (
          <div
            style={{
              background: 'rgba(0, 135, 81, 0.2)',
              border: '1px solid rgba(0, 255, 135, 0.4)',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#00ff87',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{confettiSuccessMessage}</span>
          </div>
        )}

        {/* MILESTONE INTERVAL CONFIGURATOR */}
        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AUTO-CONFETTI TRIGGER FREQUENCY FOR THE ZONE:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {[5000, 10000, 20000, 25000].map((val) => {
                  const isActive = currentInterval === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSetInterval(val)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: isActive ? '#008751' : 'rgba(255, 255, 255, 0.06)',
                        border: isActive ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.12)',
                        color: isActive ? '#ffffff' : '#cbd5e1',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Every {val.toLocaleString()} Souls {isActive ? '✓ (Active)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetCelebratedTracker}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Reset celebrated milestones local cache to re-test auto celebrations"
            >
              <RotateCcw size={12} />
              <span>Reset Celebrated Tracker</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. LIVE COMMAND CENTER OPERATIONAL DASHBOARD */}
      <div className="command-center-section">
        <div className="command-center-header">
          <div className="cc-title-row">
            <Activity size={22} className="text-green" />
            <h3 className="cc-title">LIVE COMMAND CENTER</h3>
          </div>
        </div>

        {/* HUGE METRICS DISPLAY */}
        <div className="command-hero-numbers">
          <div className="cc-number-card">
            <span className="cc-num-label">SOULS WON</span>
            <div className="cc-num-value text-green">
              {counterData.totalSoulsWon.toLocaleString()}
            </div>
          </div>

          <div className="cc-number-card">
            <span className="cc-num-label">ZONAL TARGET</span>
            <div className="cc-num-value">{counterData.zonalTarget.toLocaleString()}</div>
          </div>

          <div className="cc-number-card">
            <span className="cc-num-label">PERCENTAGE ACHIEVED</span>
            <div className="cc-num-value text-green">
              {counterData.percentageAchieved}%
            </div>
          </div>
        </div>

        {/* OPERATIONAL COUNTS GRID */}
        <div className="cc-counts-grid">
          <div className="cc-count-box">
            <Building2 size={20} className="icon-muted" />
            <div className="cc-count-info">
              <span className="cc-count-val">{counts.zones}</span>
              <span className="cc-count-lbl">ACTIVE ZONES</span>
            </div>
          </div>

          <div className="cc-count-box">
            <Building2 size={20} className="icon-muted" />
            <div className="cc-count-info">
              <span className="cc-count-val">{counts.groups}</span>
              <span className="cc-count-lbl">ACTIVE GROUPS</span>
            </div>
          </div>

          <div className="cc-count-box">
            <Building2 size={20} className="icon-muted" />
            <div className="cc-count-info">
              <span className="cc-count-val">{counts.churches}</span>
              <span className="cc-count-lbl">ACTIVE CHURCHES</span>
            </div>
          </div>

          <div className="cc-count-box">
            <Users size={20} className="icon-muted" />
            <div className="cc-count-info">
              <span className="cc-count-val">{counts.soulWinners}</span>
              <span className="cc-count-lbl">ACTIVE WINNERS</span>
            </div>
          </div>
        </div>

        {/* COMPACT UPWARD RACE FOR COMMAND CENTER */}
        <div className="cc-race-wrapper">
          <h4 className="cc-section-title">
            <TrendingUp size={18} /> GROUPS UPWARD RACE
          </h4>
          <UpwardRaceVisualization competitors={counterData.groupCompetitors} />
        </div>

        {/* AUDIT LOG SECTION */}
        {auditLogs.length > 0 && (
          <div className="audit-log-section">
            <h4 className="cc-section-title">
              <History size={18} /> EVENT ACTION AUDIT LOG
            </h4>
            <div className="audit-log-list">
              {auditLogs.map((log) => (
                <div key={log.id} className="audit-log-item">
                  <span className="audit-action">
                    {log.action === 'event_started' ? 'START EVENT' : 'END EVENT'}
                  </span>
                  <span className="audit-actor">Actor: {log.actorId}</span>
                  <span className="audit-time">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-event-modal">
            <AlertTriangle size={36} className="text-warning mx-auto" />
            <h3 className="modal-title text-center">
              {confirmModal.targetStatus === 'live' ? 'START EVENT?' : 'END EVENT?'}
            </h3>
            <p className="modal-subtitle text-center">
              {confirmModal.targetStatus === 'live'
                ? 'This will make the event visible as LIVE to public observers and activate real-time progress calculations.'
                : 'This will mark the event as COMPLETED and close soul recording for normal Soul Winners. Final totals will be preserved.'}
            </p>

            <div className="modal-actions-row">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, targetStatus: null })}
                disabled={isProcessing}
                className="secondary-button"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteStatusChange}
                disabled={isProcessing}
                className={
                  confirmModal.targetStatus === 'live'
                    ? 'submit-button'
                    : 'danger-button'
                }
              >
                {isProcessing
                  ? 'PROCESSING...'
                  : confirmModal.targetStatus === 'live'
                  ? 'CONFIRM START'
                  : 'CONFIRM END'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SOULS TO ZERO CONFIRMATION MODAL */}
      {resetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card confirm-event-modal">
            <AlertTriangle size={36} className="text-warning mx-auto" />
            <h3 className="modal-title text-center text-danger">RESET SOULS TO ZERO?</h3>
            <p className="modal-subtitle text-center">
              Are you sure you want to reset the campaign counter? This will permanently delete all soul winning submission records from the database and local storage, setting the total soul counter back to 0.
            </p>

            <div className="modal-actions-row">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={isProcessing}
                className="secondary-button"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handlePurgeSouls}
                disabled={isProcessing}
                className="danger-button"
              >
                {isProcessing ? 'RESETTING...' : 'YES, RESET TO ZERO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
