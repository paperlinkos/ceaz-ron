import React, { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';

interface CampaignCountdownTimerProps {
  variant?: 'home' | 'bigScreen';
  className?: string;
}

// Target: 9:00 AM on 1 October 2026 (West Africa Time / UTC+1)
const TARGET_DATE_STRING = '2026-10-01T09:00:00+01:00';
const TARGET_TIMESTAMP = new Date(TARGET_DATE_STRING).getTime();

export const CampaignCountdownTimer: React.FC<CampaignCountdownTimerProps> = ({
  variant = 'home',
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(() => {
    const diff = TARGET_TIMESTAMP - Date.now();
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
      const now = Date.now();
      const diff = TARGET_TIMESTAMP - now;
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

    // Run every second
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // When timer reaches 0 or passes October 1st 9:00 AM, the component completely disappears
  if (!timeLeft || timeLeft.totalMs <= 0) {
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
          <span>OCTOBER 1ST • 9:00 AM WAT</span>
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
