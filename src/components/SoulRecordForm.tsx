import React, { useState, useRef, useEffect } from 'react';
import { User, Phone, Send, CheckCircle2, History, Lock } from 'lucide-react';
import type { FormSubmissionData } from '../types/record';
import type { SubmissionResult } from '../hooks/useSoulRecords';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { EventStatus } from '../config/eventConfig';
import { checkSingleRecordDuplicate } from '../services/duplicateDetectionService';

interface SoulRecordFormProps {
  onSubmit: (data: FormSubmissionData) => Promise<SubmissionResult>;
  isSubmitting: boolean;
  mySoulsWon?: number;
  onViewHistory?: () => void;
  eventStatus?: EventStatus;
}

export const SoulRecordForm: React.FC<SoulRecordFormProps> = ({
  onSubmit,
  isSubmitting,
  mySoulsWon = 0,
  onViewHistory,
  eventStatus = 'live',
}) => {
  const { isOnline } = useNetworkStatus();

  const [formData, setFormData] = useState<FormSubmissionData>({
    name: '',
    phone: '',
    location: '',
    isBornAgain: true,
    isFilledWithHolySpirit: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    isOffline: boolean;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formData.phone.length >= 7 || formData.name.trim().length >= 3) {
      const timer = setTimeout(async () => {
        const res = await checkSingleRecordDuplicate(formData.name, formData.phone, formData.location);
        if (res.isDuplicate) {
          setDuplicateWarning(res.matchReason || 'Potential duplicate soul detected.');
        } else {
          setDuplicateWarning(null);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.name, formData.phone, formData.location]);

  useEffect(() => {
    if (!successResult) {
      nameInputRef.current?.focus();
    }
  }, [successResult]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSuccessResult(null);

    const result = await onSubmit(formData);

    if (result.success) {
      setSuccessResult({
        isOffline: result.isOfflineSubmitted,
      });
      setFormData({ name: '', phone: '', location: '', isBornAgain: true, isFilledWithHolySpirit: true });
      setErrors({});
    } else if (result.errors) {
      setErrors(result.errors);
    }
  };

  const handleResetForNext = () => {
    setSuccessResult(null);
    setFormData({ name: '', phone: '', location: '', isBornAgain: true, isFilledWithHolySpirit: true });
    setErrors({});
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const launchTimestamp = new Date('2026-10-01T09:00:00+01:00').getTime();
  const isBeforeLaunch = Date.now() < launchTimestamp || eventStatus === 'upcoming';

  if (isBeforeLaunch) {
    return (
      <div className="form-card rapid-record-card event-completed-card">
        <div className="completed-lock-badge" style={{ background: 'rgba(0, 135, 81, 0.1)', border: '1.5px solid rgba(0, 135, 81, 0.3)' }}>
          <Lock size={36} style={{ color: '#008751' }} />
        </div>
        <h2 className="form-title text-center">CAMPAIGN LAUNCH COUNTDOWN</h2>
        <p className="form-lead text-center">
          Soul winning recording is locked until the official campaign launch at 9:00 AM WAT when the countdown ends.
        </p>
        {onViewHistory && (
          <div className="form-footer-link-row">
            <button
              type="button"
              onClick={onViewHistory}
              className="text-link-subtle"
            >
              <History size={15} />
              <span>View My Submissions</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (eventStatus === 'completed') {
    return (
      <div className="form-card rapid-record-card event-completed-card">
        <div className="completed-lock-badge">
          <Lock size={36} className="text-muted" />
        </div>
        <h2 className="form-title text-center">EVENT COMPLETED</h2>
        <p className="form-lead text-center">
          Soul recording for CEAZ1 Reachout Nigeria Soul Winning Campaign 2026 is now closed.
        </p>
        {mySoulsWon > 0 && (
          <div className="my-total-pill mx-auto">
            MY FINAL SOULS WON: <strong>{mySoulsWon}</strong>
          </div>
        )}
        {onViewHistory && (
          <div className="form-footer-link-row">
            <button
              type="button"
              onClick={onViewHistory}
              className="text-link-subtle"
            >
              <History size={15} />
              <span>View My Submissions</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (successResult) {
    return (
      <div className="form-card rapid-success-card" tabIndex={-1}>
        <div className="success-badge-glow">
          <CheckCircle2 size={48} className="success-icon" />
        </div>

        <h2 className="success-title">SOUL RECORDED</h2>
        <div className="success-count-plus">+1</div>

        {successResult.isOffline ? (
          <div className="offline-success-box">
            <span className="offline-badge-tag">SAVED LOCALLY</span>
            <p className="offline-subtext">WILL SYNC WHEN ONLINE</p>
          </div>
        ) : (
          <p className="success-subtext">Soul successfully added to campaign records.</p>
        )}

        {mySoulsWon > 0 && (
          <div className="my-total-pill">
            MY TOTAL SOULS WON: <strong>{mySoulsWon}</strong>
          </div>
        )}

        <div className="success-actions-row">
          <button
            type="button"
            onClick={handleResetForNext}
            className="submit-button fast-record-btn"
            autoFocus
          >
            RECORD ANOTHER
          </button>

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="secondary-button view-history-btn"
            >
              <History size={16} />
              <span>MY SUBMISSIONS</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="form-card rapid-record-card">
      <div className="record-form-top-bar">
        <div className="form-header-clean">
          <h2 className="form-title">RECORD A SOUL</h2>
          {mySoulsWon > 0 && (
            <span className="personal-count-chip">MY SOULS: {mySoulsWon}</span>
          )}
        </div>

        {!isOnline && (
          <div className="network-indicator-badge">
            <span className="net-status net-offline">
              <span className="dot-offline">○</span> OFFLINE — SAVING LOCALLY
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="record-form">
        {/* 1. NAME FIELD */}
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            NAME
          </label>
          <div className="input-wrapper">
            <User size={18} className="input-icon" />
            <input
              id="name"
              ref={nameInputRef}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
              disabled={isSubmitting}
              maxLength={100}
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  phoneInputRef.current?.focus();
                }
              }}
            />
          </div>
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        {/* 2. PHONE NUMBER FIELD */}
        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            PHONE NUMBER
          </label>
          <div className="input-wrapper">
            <Phone size={18} className="input-icon" />
            <input
              id="phone"
              ref={phoneInputRef}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              disabled={isSubmitting}
              maxLength={20}
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
            />
          </div>
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </div>

        {/* 3. SPIRITUAL STATUS (BORN AGAIN & FILLED WITH THE SPIRIT) */}
        <div className="form-group">
          <label className="form-label">SPIRITUAL STATUS</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: formData.isBornAgain ? 'rgba(0, 135, 81, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: formData.isBornAgain ? '1.5px solid #008751' : '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                color: formData.isBornAgain ? '#4ade80' : '#94a3b8',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                userSelect: 'none',
                flex: '1 1 140px',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                name="isBornAgain"
                checked={formData.isBornAgain ?? true}
                onChange={(e) => setFormData((prev) => ({ ...prev, isBornAgain: e.target.checked }))}
                disabled={isSubmitting}
                style={{ width: '18px', height: '18px', accentColor: '#008751', cursor: 'pointer' }}
              />
              <span>✨ Born Again</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: formData.isFilledWithHolySpirit ? 'rgba(255, 215, 0, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                border: formData.isFilledWithHolySpirit ? '1.5px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                color: formData.isFilledWithHolySpirit ? '#FFD700' : '#94a3b8',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                userSelect: 'none',
                flex: '1 1 140px',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                name="isFilledWithHolySpirit"
                checked={formData.isFilledWithHolySpirit ?? true}
                onChange={(e) => setFormData((prev) => ({ ...prev, isFilledWithHolySpirit: e.target.checked }))}
                disabled={isSubmitting}
                style={{ width: '18px', height: '18px', accentColor: '#FFD700', cursor: 'pointer' }}
              />
              <span>🔥 Filled with The Spirit</span>
            </label>
          </div>
        </div>

        {duplicateWarning && (
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '12px' }}>
            ⚠️ DUPLICATE WARNING: {duplicateWarning}
          </div>
        )}

        {errors.general && <div className="general-error-box">{errors.general}</div>}

        {/* PRIMARY SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="submit-button record-primary-btn"
        >
          <Send size={20} className={isSubmitting ? 'animate-pulse' : ''} />
          <span>{isSubmitting ? 'RECORDING...' : 'RECORD SOUL'}</span>
        </button>
      </form>

      {onViewHistory && (
        <div className="form-footer-link-row">
          <button
            type="button"
            onClick={onViewHistory}
            className="text-link-subtle"
          >
            <History size={15} />
            <span>View My Submissions</span>
          </button>
        </div>
      )}
    </div>
  );
};
