import React, { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';
import { useEventConfig } from '../../hooks/useEventConfig';

interface CampaignCountdownTimerProps {
  variant?: 'home' | 'bigScreen';
  className?: string;
  enabled?: boolean;
}

// Default fallback target: 9:00 AM on 1 October 2026 (West Africa Time / UTC+1)
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

export const CampaignCountdownTimer: React.FC<CampaignCountdownTimerProps> = ({
  variant = 'home',
  className = '',
  enabled,
}) => {
  const { eventConfig } = useEventConfig();
  const isEnabled = enabled !== undefined ? enabled : eventConfig?.countdownTimerEnabled !== false;
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

  useEffect(() => {
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
    // Run every second
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [eventConfig?.countdownTargetTime, eventConfig?.scheduledStartAt, eventConfig?.startAt, eventConfig?.status]);

  // When disabled by Super Admin, or timer reaches 0, the component completely disappears
  if (!isEnabled || !timeLeft || timeLeft.totalMs <= 0) {
    return null;
  }

  const pad = (num: number) => num.toString().padStart(2, '0');

  const isBigScreen = variant === 'bigScreen';

  return (
    <div
      className={`campaign-countdown-card ${isBigScreen ? 'countdown-bigscreen' : 'countdown-home'} ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining until campaign launch: ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`}
    >
      {/* Title / Badge */}
      <div className="countdown-header">
        <div className="countdown-badge">
          <span className="countdown-pulse-dot" />
          <Timer size={isBigScreen ? 14 : 13} className="countdown-icon" />
          <span className="countdown-title">
            {isBigScreen ? 'OFFICIAL LAUNCH COUNTDOWN' : 'CAMPAIGN LAUNCH COUNTDOWN'}
          </span>
        </div>
        <span className="countdown-target-subtext">
          <Zap size={11} style={{ color: '#d97706' }} />
          <span>{targetLabel}</span>
        </span>
      </div>

      {/* Digits Display */}
      <div className="countdown-digits-grid">
        {/* DAYS */}
        <div className="countdown-unit-box">
          <div className="countdown-number">{pad(timeLeft.days)}</div>
          <div className="countdown-label">DAYS</div>
        </div>

        <div className="countdown-colon">:</div>

        {/* HOURS */}
        <div className="countdown-unit-box">
          <div className="countdown-number">{pad(timeLeft.hours)}</div>
          <div className="countdown-label">HOURS</div>
        </div>

        <div className="countdown-colon">:</div>

        {/* MINUTES */}
        <div className="countdown-unit-box">
          <div className="countdown-number">{pad(timeLeft.minutes)}</div>
          <div className="countdown-label">MINS</div>
        </div>

        <div className="countdown-colon">:</div>

        {/* SECONDS */}
        <div className="countdown-unit-box countdown-unit-secs">
          <div className="countdown-number countdown-number-accent">{pad(timeLeft.seconds)}</div>
          <div className="countdown-label">SECS</div>
        </div>
      </div>
    </div>
  );
};
