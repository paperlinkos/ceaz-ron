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
  Pencil,
  Zap,
  Save,
} from 'lucide-react';
import { useEventConfig } from '../../hooks/useEventConfig';
import { getEventAuditLogs } from '../../services/eventService';
import type { EventConfig, EventAuditLog, EventStatus } from '../../config/eventConfig';
import { UpwardRaceVisualization } from '../public/UpwardRaceVisualization';
import {
  subscribeToNationalCounter,
  purgeAllSoulWinningRecords,
  type ZonalCounterData,
} from '../../services/counterService';
import { getZones, getGroups, getChurches } from '../../services/organizationService';
import { MilestoneCelebrationManager } from './MilestoneCelebrationManager';

function toDatetimeLocal(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  } catch {
    return '';
  }
}

function fromDatetimeLocal(localStr: string): string {
  if (!localStr) return '';
  const d = new Date(localStr);
  return d.toISOString();
}

export const EventControlView: React.FC = () => {
  const { eventConfig, isUpcoming, isLive, isCompleted, changeStatus, saveSettings, triggerCelebration } = useEventConfig();
  const [isTriggeringConfetti, setIsTriggeringConfetti] = useState<boolean>(false);
  const [confettiSuccessMessage, setConfettiSuccessMessage] = useState<string | null>(null);
  const [isTogglingTimer, setIsTogglingTimer] = useState<boolean>(false);
  const [timerFeedback, setTimerFeedback] = useState<string | null>(null);
  const currentInterval = eventConfig.milestoneInterval || 10000;

  const isTimerEnabled = eventConfig.countdownTimerEnabled !== false;

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [formStart, setFormStart] = useState<string>('');
  const [formEnd, setFormEnd] = useState<string>('');
  const [formSyncCountdown, setFormSyncCountdown] = useState<boolean>(true);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<string | null>(null);

  // Countdown Settings State
  const [countdownTargetInput, setCountdownTargetInput] = useState<string>('');
  const [countdownLabelInput, setCountdownLabelInput] = useState<string>('');
  const [isSavingCountdown, setIsSavingCountdown] = useState<boolean>(false);
  const [countdownSaveMsg, setCountdownSaveMsg] = useState<string | null>(null);
  const [, setPreviewTick] = useState<number>(0);

  // Live tick for preview inside countdown settings card
  useEffect(() => {
    const t = setInterval(() => setPreviewTick((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Sync inputs with eventConfig
  useEffect(() => {
    const target =
      eventConfig.countdownTargetTime ||
      eventConfig.scheduledStartAt ||
      '2026-10-01T09:00:00+01:00';
    setCountdownTargetInput(toDatetimeLocal(target));
    setCountdownLabelInput(eventConfig.countdownLabel || 'OCTOBER 1ST • 9:00 AM WAT');
  }, [eventConfig.countdownTargetTime, eventConfig.scheduledStartAt, eventConfig.countdownLabel]);

  const handleOpenScheduleModal = () => {
    const currentStart =
      eventConfig.scheduledStartAt ||
      (eventConfig.startAt && isUpcoming ? eventConfig.startAt : null) ||
      '2026-10-01T09:00:00+01:00';
    const currentEnd =
      eventConfig.scheduledEndAt ||
      eventConfig.endAt ||
      '2026-10-01T23:59:59+01:00';

    setFormStart(toDatetimeLocal(currentStart));
    setFormEnd(toDatetimeLocal(currentEnd));
    setFormSyncCountdown(eventConfig.countdownSyncWithStart !== false);
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const startIso = formStart ? fromDatetimeLocal(formStart) : '';
      const endIso = formEnd ? fromDatetimeLocal(formEnd) : '';

      const updates: Partial<EventConfig> = {
        scheduledStartAt: startIso || undefined,
        scheduledEndAt: endIso || undefined,
        countdownSyncWithStart: formSyncCountdown,
      };

      if (formSyncCountdown && startIso) {
        updates.countdownTargetTime = startIso;
      }

      const ok = await saveSettings(updates);
      if (ok) {
        setScheduleModalOpen(false);
        setScheduleFeedback('Event start & end schedule updated and broadcast in real-time!');
        setTimeout(() => setScheduleFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSaveCountdownSettings = async () => {
    setIsSavingCountdown(true);
    try {
      const targetIso = countdownTargetInput ? fromDatetimeLocal(countdownTargetInput) : '2026-10-01T09:00:00+01:00';
      const label = countdownLabelInput.trim() || 'OCTOBER 1ST • 9:00 AM WAT';
      const ok = await saveSettings({
        countdownTargetTime: targetIso,
        countdownLabel: label,
      });
      if (ok) {
        setCountdownSaveMsg('Countdown launch target and label updated across all screens!');
        setTimeout(() => setCountdownSaveMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save countdown settings:', err);
    } finally {
      setIsSavingCountdown(false);
    }
  };

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

  const displayStart = (() => {
    if (isLive || isCompleted) {
      if (eventConfig.startAt) {
        return {
          status: isLive ? 'LIVE STARTED' : 'STARTED',
          formatted: new Date(eventConfig.startAt).toLocaleString(),
          isSet: true,
        };
      }
    }
    const sched = eventConfig.scheduledStartAt || (isUpcoming ? eventConfig.startAt : null);
    if (sched) {
      return {
        status: 'SCHEDULED',
        formatted: new Date(sched).toLocaleString(),
        isSet: true,
      };
    }
    return {
      status: 'NOT STARTED',
      formatted: 'Not Started',
      isSet: false,
    };
  })();

  const displayEnd = (() => {
    if (isCompleted && eventConfig.endAt) {
      return {
        status: 'COMPLETED',
        formatted: new Date(eventConfig.endAt).toLocaleString(),
        isSet: true,
      };
    }
    const sched = eventConfig.scheduledEndAt || eventConfig.endAt;
    if (sched) {
      return {
        status: 'SCHEDULED',
        formatted: new Date(sched).toLocaleString(),
        isSet: true,
      };
    }
    return {
      status: 'NOT ENDED',
      formatted: 'Not Ended',
      isSet: false,
    };
  })();

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

          {/* INTERACTIVE START TIME CARD */}
          <div
            className="config-metric-item"
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={handleOpenScheduleModal}
            title="Click to set or edit campaign start time"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="config-label">START TIME</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenScheduleModal();
                }}
                style={{
                  background: 'rgba(0, 135, 81, 0.15)',
                  border: '1px solid rgba(0, 230, 118, 0.4)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  color: '#00e676',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={10} />
                <span>{displayStart.isSet ? 'EDIT' : 'SET'}</span>
              </button>
            </div>
            <div className="config-value-row">
              <Clock size={16} style={{ color: displayStart.isSet ? '#008751' : '#64748b' }} />
              <div>
                <span className="config-subvalue" style={{ color: displayStart.isSet ? '#0f172a' : '#64748b', fontWeight: 800 }}>
                  {displayStart.formatted}
                </span>
                {displayStart.isSet && (
                  <span style={{ marginLeft: '6px', fontSize: '0.65rem', color: '#008751', background: 'rgba(0, 135, 81, 0.12)', border: '1px solid rgba(0, 135, 81, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                    {displayStart.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* INTERACTIVE END TIME CARD */}
          <div
            className="config-metric-item"
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={handleOpenScheduleModal}
            title="Click to set or edit campaign end time"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="config-label">END TIME</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenScheduleModal();
                }}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  color: '#0284c7',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={10} />
                <span>{displayEnd.isSet ? 'EDIT' : 'SET'}</span>
              </button>
            </div>
            <div className="config-value-row">
              <Clock size={16} style={{ color: displayEnd.isSet ? '#0284c7' : '#64748b' }} />
              <div>
                <span className="config-subvalue" style={{ color: displayEnd.isSet ? '#0f172a' : '#64748b', fontWeight: 800 }}>
                  {displayEnd.formatted}
                </span>
                {displayEnd.isSet && (
                  <span style={{ marginLeft: '6px', fontSize: '0.65rem', color: '#0284c7', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                    {displayEnd.status}
                  </span>
                )}
              </div>
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

            {/* SET START & END TIME MODAL BUTTON */}
            <button
              type="button"
              onClick={handleOpenScheduleModal}
              className="secondary-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1.5px solid rgba(0, 135, 81, 0.45)',
                borderRadius: '10px',
                padding: '10px 18px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Clock size={16} style={{ color: '#00e676' }} />
              <span>SET START & END TIME</span>
            </button>
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

        {scheduleFeedback && (
          <div className="reset-feedback-banner" style={{ background: 'rgba(0, 135, 81, 0.2)', border: '1px solid #00ff87', color: '#00ff87' }}>
            <CheckCircle2 size={16} />
            <span>{scheduleFeedback}</span>
          </div>
        )}

        {resetSuccessMessage && (
          <div className="reset-feedback-banner">
            <CheckCircle2 size={16} />
            <span>{resetSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* CAMPAIGN COUNTDOWN & LAUNCH SETTINGS CARD */}
      <div
        className="event-section-card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(13, 38, 27, 0.75) 100%)',
          border: '1.5px solid rgba(0, 135, 81, 0.35)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* TOP ROW: TITLE & MASTER TOGGLE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
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
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  CAMPAIGN LAUNCH COUNTDOWN & TARGET SETTINGS
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
                Configure the launch countdown target time and label. Displays on the <strong>Home Screen</strong> and in <strong>Big Screen Mode</strong> until launch.
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

        {/* SETTINGS CONTROLS & LIVE PREVIEW GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', background: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {/* LEFT: FORM INPUTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                COUNTDOWN TARGET DATE & TIME
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="datetime-local"
                  value={countdownTargetInput}
                  onChange={(e) => setCountdownTargetInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1.5px solid rgba(0, 135, 81, 0.4)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              {/* QUICK PRESETS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCountdownTargetInput('2026-10-01T09:00')}
                  style={{
                    background: 'rgba(0, 135, 81, 0.15)',
                    border: '1px solid rgba(0, 230, 118, 0.3)',
                    color: '#00e676',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  🎯 1 Oct 2026, 9:00 AM WAT
                </button>

                {(eventConfig.scheduledStartAt || formStart) && (
                  <button
                    type="button"
                    onClick={() => {
                      const start = formStart || toDatetimeLocal(eventConfig.scheduledStartAt);
                      if (start) setCountdownTargetInput(start);
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Match Scheduled Start
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
                    setCountdownTargetInput(toDatetimeLocal(inOneHour.toISOString()));
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ⏱️ +1 Hour (Quick Test)
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                BANNER SUBTITLE / LOCATION LABEL
              </label>
              <input
                type="text"
                value={countdownLabelInput}
                onChange={(e) => setCountdownLabelInput(e.target.value)}
                placeholder="e.g. OCTOBER 1ST • 9:00 AM WAT"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1.5px solid rgba(0, 135, 81, 0.4)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {['OCTOBER 1ST • 9:00 AM WAT', 'CAMPAIGN KICKOFF', 'ZONAL HARVEST LAUNCH'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCountdownLabelInput(preset)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '3px 7px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div>
              <button
                type="button"
                onClick={handleSaveCountdownSettings}
                disabled={isSavingCountdown}
                style={{
                  background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)',
                  border: '1.5px solid #00ff87',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: isSavingCountdown ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 135, 81, 0.4)',
                }}
              >
                <Save size={16} />
                <span>{isSavingCountdown ? 'SAVING...' : 'SAVE COUNTDOWN SETTINGS'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT: LIVE VISUAL PREVIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              LIVE PREVIEW (HOW IT LOOKS TO THE PUBLIC):
            </span>

            {/* PREVIEW CONTAINER */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 38, 27, 0.9) 100%)',
                border: '1.5px solid rgba(0, 135, 81, 0.4)',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                opacity: isTimerEnabled ? 1 : 0.45,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676', display: 'inline-block', boxShadow: '0 0 8px #00e676' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>
                    OFFICIAL LAUNCH COUNTDOWN
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={11} /> {countdownLabelInput || 'OCTOBER 1ST • 9:00 AM WAT'}
                </span>
              </div>

              {/* DIGITS ROW */}
              {(() => {
                const targetMs = countdownTargetInput ? new Date(countdownTargetInput).getTime() : 0;
                const diff = targetMs ? targetMs - Date.now() : 0;
                const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
                const days = diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
                const hours = diff > 0 ? Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) : 0;
                const minutes = diff > 0 ? Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) : 0;
                const seconds = diff > 0 ? Math.floor((diff % (1000 * 60)) / 1000) : 0;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '48px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', fontFamily: "'Orbitron', sans-serif" }}>{pad(days)}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8' }}>DAYS</div>
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e676', fontFamily: "'Orbitron', sans-serif" }}>:</span>
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '48px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', fontFamily: "'Orbitron', sans-serif" }}>{pad(hours)}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8' }}>HOURS</div>
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e676', fontFamily: "'Orbitron', sans-serif" }}>:</span>
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '48px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', fontFamily: "'Orbitron', sans-serif" }}>{pad(minutes)}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8' }}>MINS</div>
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e676', fontFamily: "'Orbitron', sans-serif" }}>:</span>
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', minWidth: '48px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#00e676', fontFamily: "'Orbitron', sans-serif" }}>{pad(seconds)}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#00e676' }}>SECS</div>
                    </div>
                  </div>
                );
              })()}

              {!isTimerEnabled && (
                <div style={{ fontSize: '0.72rem', color: '#fbbf24', textAlign: 'center', fontWeight: 700 }}>
                  ⚠️ Countdown is currently disabled and hidden from users
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
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

        {countdownSaveMsg && (
          <div
            style={{
              marginTop: '14px',
              background: 'rgba(0, 135, 81, 0.2)',
              border: '1px solid #00ff87',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#00ff87',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={15} />
            <span>{countdownSaveMsg}</span>
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

      {/* SET EVENT START & END SCHEDULE MODAL */}
      {scheduleModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '540px', width: '100%', padding: '28px', background: '#0f172a', border: '1.5px solid rgba(0, 135, 81, 0.45)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(0, 135, 81, 0.2)', border: '1px solid #008751', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e676' }}>
                <Clock size={22} />
              </div>
              <div>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                  SET CAMPAIGN START & END SCHEDULE
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Configure scheduled times for Abuja Zone 1 and optionally sync the countdown timer.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
              {/* START TIME FIELD */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  <span>CAMPAIGN START DATE & TIME</span>
                  <span style={{ color: '#00e676', fontSize: '0.7rem' }}>KICKOFF</span>
                </label>
                <input
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(2, 6, 23, 0.85)',
                    border: '1.5px solid rgba(0, 135, 81, 0.5)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {/* PRESETS FOR START */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormStart('2026-10-01T09:00')}
                    style={{
                      background: 'rgba(0, 135, 81, 0.2)',
                      border: '1px solid #00e676',
                      color: '#00e676',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    📅 1 Oct 2026, 9:00 AM WAT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setHours(9, 0, 0, 0);
                      setFormStart(toDatetimeLocal(d.toISOString()));
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    🕒 Today 9:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStart(toDatetimeLocal(new Date().toISOString()))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Set to Right Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStart('')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Clear Start Time
                  </button>
                </div>
              </div>

              {/* END TIME FIELD */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  <span>CAMPAIGN END DATE & TIME</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.7rem' }}>CONCLUSION</span>
                </label>
                <input
                  type="datetime-local"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(2, 6, 23, 0.85)',
                    border: '1.5px solid rgba(56, 189, 248, 0.5)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {/* PRESETS FOR END */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormEnd('2026-10-01T23:59')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    📅 1 Oct 2026, 11:59 PM WAT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formStart) {
                        const startD = new Date(formStart);
                        startD.setHours(startD.getHours() + 12);
                        setFormEnd(toDatetimeLocal(startD.toISOString()));
                      } else {
                        const d = new Date();
                        d.setHours(d.getHours() + 12);
                        setFormEnd(toDatetimeLocal(d.toISOString()));
                      }
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    🕒 Start Time +12 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormEnd('')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Clear End Time
                  </button>
                </div>
              </div>

              {/* SYNC COUNTDOWN TIMER TOGGLE */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(0, 135, 81, 0.12)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0, 135, 81, 0.25)' }}>
                <input
                  type="checkbox"
                  checked={formSyncCountdown}
                  onChange={(e) => setFormSyncCountdown(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#008751', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>
                  Automatically update <strong>Launch Countdown Timer</strong> target to match this Start Time
                </span>
              </label>
            </div>

            {/* ACTION BUTTONS */}
            <div className="modal-actions-row" style={{ marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                disabled={isSavingSchedule}
                className="secondary-button"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
                className="submit-button"
                style={{ background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)', border: '1.5px solid #00ff87' }}
              >
                {isSavingSchedule ? 'SAVING SCHEDULE...' : 'SAVE SCHEDULE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
