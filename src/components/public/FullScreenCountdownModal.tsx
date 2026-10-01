import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, X, Timer, Zap, Sparkles } from 'lucide-react';
import { useEventConfig } from '../../hooks/useEventConfig';

interface FullScreenCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fallback target: 9:00 AM on 1 October 2026 (West Africa Time / UTC+1)
const DEFAULT_TARGET_DATE_STRING = '2026-10-01T09:00:00+01:00';

function getTargetTimestamp(config?: {
  countdownTargetTime?: string;
  scheduledStartAt?: string;
  startAt?: string;
  status?: string;
}): number {
  const dateStr =
    config?.countdownTargetTime ||
    config?.scheduledStartAt ||
    (config?.startAt && config.status === 'upcoming' ? config.startAt : null) ||
    DEFAULT_TARGET_DATE_STRING;

  const timestamp = new Date(dateStr).getTime();
  return isNaN(timestamp) ? new Date(DEFAULT_TARGET_DATE_STRING).getTime() : timestamp;
}

export const FullScreenCountdownModal: React.FC<FullScreenCountdownModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { eventConfig } = useEventConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const targetLabel = eventConfig?.countdownLabel || 'OCTOBER 1ST • 9:00 AM WAT';

  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(() => {
    const targetTimestamp = getTargetTimestamp(eventConfig);
    const diff = targetTimestamp - Date.now();
    if (diff <= 0) return null;
    return {
      totalMs: diff,
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  });

  // Keep countdown updated every second
  useEffect(() => {
    if (!isOpen) return;

    const updateCountdown = () => {
      const targetTimestamp = getTargetTimestamp(eventConfig);
      const now = Date.now();
      const diff = targetTimestamp - now;
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        totalMs: diff,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen, eventConfig?.countdownTargetTime, eventConfig?.scheduledStartAt, eventConfig?.startAt, eventConfig?.status]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onClose();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[FullScreenCountdown] Fullscreen error:', err);
    }
  };

  if (!isOpen) return null;

  const pad = (num: number) => num.toString().padStart(2, '0');
  const isFinished = !timeLeft || timeLeft.totalMs <= 0;

  return (
    <div
      ref={containerRef}
      className="fullscreen-countdown-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Full Screen Campaign Countdown"
    >
      {/* Top Header Bar */}
      <header className="fullscreen-countdown-header">
        <div className="fullscreen-countdown-brand">
          <img
            src="/reachout_world_nigeria_logo.png"
            alt="ReachOut World Nigeria Logo"
            className="fullscreen-countdown-logo"
          />
          <div className="fullscreen-countdown-brand-text">
            <span className="fullscreen-countdown-zone">CHRIST EMBASSY ABUJA ZONE 1</span>
            <span className="fullscreen-countdown-campaign">REACHOUT NIGERIA CAMPAIGN</span>
          </div>
        </div>

        <div className="fullscreen-countdown-controls">
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="fullscreen-countdown-ctrl-btn"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="fullscreen-countdown-ctrl-btn fullscreen-countdown-close-btn"
            title="Exit Countdown Screen (Esc)"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      {/* Main Countdown Display Centerpiece */}
      <main className="fullscreen-countdown-main">
        {isFinished ? (
          <div className="fullscreen-countdown-live-banner">
            <div className="countdown-live-badge-glow">
              <Sparkles size={24} className="live-spin-icon" />
              <span>OFFICIAL LAUNCH ACHIEVED</span>
            </div>
            <h1 className="fullscreen-countdown-live-title">CAMPAIGN IS LIVE!</h1>
            <p className="fullscreen-countdown-live-desc">
              CEAZ1 ReachOut Nigeria Soul Winning Campaign is officially underway.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="fullscreen-countdown-return-btn"
            >
              <span>VIEW LIVE SOULS COUNTER</span>
            </button>
          </div>
        ) : (
          <div className="fullscreen-countdown-stage">
            {/* Badge Indicator */}
            <div className="fullscreen-countdown-pill">
              <span className="fullscreen-pulse-dot" />
              <Timer size={18} />
              <span>OFFICIAL LAUNCH COUNTDOWN</span>
            </div>

            {/* MONUMENTAL DIGITAL CLOCK */}
            <div className="fullscreen-countdown-clock-grid">
              {/* DAYS */}
              <div className="fullscreen-clock-block">
                <div className="fullscreen-clock-digit">{pad(timeLeft.days)}</div>
                <div className="fullscreen-clock-label">DAYS</div>
              </div>

              <div className="fullscreen-clock-colon">:</div>

              {/* HOURS */}
              <div className="fullscreen-clock-block">
                <div className="fullscreen-clock-digit">{pad(timeLeft.hours)}</div>
                <div className="fullscreen-clock-label">HOURS</div>
              </div>

              <div className="fullscreen-clock-colon">:</div>

              {/* MINUTES */}
              <div className="fullscreen-clock-block">
                <div className="fullscreen-clock-digit">{pad(timeLeft.minutes)}</div>
                <div className="fullscreen-clock-label">MINUTES</div>
              </div>

              <div className="fullscreen-clock-colon">:</div>

              {/* SECONDS */}
              <div className="fullscreen-clock-block fullscreen-clock-block-secs">
                <div className="fullscreen-clock-digit fullscreen-digit-accent">
                  {pad(timeLeft.seconds)}
                </div>
                <div className="fullscreen-clock-label">SECONDS</div>
              </div>
            </div>

            {/* Launch Subtitle & Details */}
            <div className="fullscreen-countdown-footer-details">
              <div className="fullscreen-target-tag">
                <Zap size={16} className="target-zap-icon" />
                <span>LAUNCH TARGET: {targetLabel}</span>
              </div>
              <div className="fullscreen-target-goal">
                TARGET: <strong>50,000 SOULS</strong> FOR CHRIST
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Subtle Bottom Ambient Bar */}
      <footer className="fullscreen-countdown-bottom-bar">
        <span>Press <kbd>ESC</kbd> or click ✕ in the top right to return to the dashboard</span>
      </footer>
    </div>
  );
};
