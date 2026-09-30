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

export const EventControlView: React.FC = () => {
  const { eventConfig, isUpcoming, isLive, isCompleted, changeStatus } = useEventConfig();

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
