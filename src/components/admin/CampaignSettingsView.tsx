import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  Layers,
  Megaphone,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEventConfig } from '../../hooks/useEventConfig';
import {
  DEFAULT_MILESTONES,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_ZONAL_MILESTONES,
  type MilestoneConfig,
  type EventStatus,
} from '../../config/eventConfig';

export const CampaignSettingsView: React.FC = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superAdmin';
  const { eventConfig, saveSettings, triggerCelebration } = useEventConfig();

  // Form State
  const [name, setName] = useState<string>(eventConfig.name);
  const [eventDate, setEventDate] = useState<string>(eventConfig.eventDate);
  const [target, setTarget] = useState<number>(eventConfig.target);
  const [status, setStatus] = useState<EventStatus>(eventConfig.status);
  const [description, setDescription] = useState<string>(eventConfig.description || '');

  // Tunable Parameters
  const [raceThresholdYellow, setRaceThresholdYellow] = useState<number>(
    eventConfig.raceThresholdYellow ?? 50
  );
  const [raceThresholdGreen, setRaceThresholdGreen] = useState<number>(
    eventConfig.raceThresholdGreen ?? 75
  );

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneConfig[]>(
    eventConfig.milestones && eventConfig.milestones.length > 0
      ? eventConfig.milestones
      : DEFAULT_MILESTONES
  );

  // Zonal Milestones (Soul count threshold for full-screen confetti)
  const [milestoneInterval, setMilestoneInterval] = useState<number>(
    eventConfig.milestoneInterval || 10000
  );
  const [isTriggeringConfetti, setIsTriggeringConfetti] = useState<boolean>(false);

  // Live Broadcast Announcements (Running Ticker)
  const [announcements, setAnnouncements] = useState<string[]>(
    eventConfig.announcements && eventConfig.announcements.length > 0
      ? eventConfig.announcements
      : DEFAULT_ANNOUNCEMENTS
  );
  const [newAnnouncementInput, setNewAnnouncementInput] = useState<string>('');

  // Milestone Add Modal / Inline State
  const [newMilestonePct, setNewMilestonePct] = useState<string>('');
  const [newMilestoneLabel, setNewMilestoneLabel] = useState<string>('');
  const [newMilestoneBadge, setNewMilestoneBadge] = useState<string>('🎯');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState<string>('');
  const [showAddMilestone, setShowAddMilestone] = useState<boolean>(false);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if external changes happen
  useEffect(() => {
    setName(eventConfig.name);
    setEventDate(eventConfig.eventDate);
    setTarget(eventConfig.target);
    setStatus(eventConfig.status);
    setDescription(eventConfig.description || '');
    setRaceThresholdYellow(eventConfig.raceThresholdYellow ?? 50);
    setRaceThresholdGreen(eventConfig.raceThresholdGreen ?? 75);
    if (eventConfig.milestones && eventConfig.milestones.length > 0) {
      setMilestones(eventConfig.milestones);
    }
    if (eventConfig.milestoneInterval) {
      setMilestoneInterval(eventConfig.milestoneInterval);
    }
    if (eventConfig.announcements && eventConfig.announcements.length > 0) {
      setAnnouncements(eventConfig.announcements);
    }
  }, [eventConfig]);

  if (!isSuperAdmin) {
    return (
      <div className="account-card empty-card">
        <AlertCircle size={32} className="text-gold" />
        <h3 className="account-title">Settings Restricted</h3>
        <p className="account-lead">
          System and campaign configuration tweaking is restricted to SuperAdmin accounts only.
        </p>
      </div>
    );
  }

  // Milestone Handlers
  const handleAddMilestone = () => {
    const pct = parseInt(newMilestonePct, 10);
    if (isNaN(pct) || pct <= 0) {
      setErrorMsg('Milestone percentage must be a valid number greater than 0.');
      return;
    }
    if (!newMilestoneLabel.trim()) {
      setErrorMsg('Please enter a milestone title or label.');
      return;
    }

    const newM: MilestoneConfig = {
      id: `m-${pct}-${Date.now().toString(36)}`,
      percentage: pct,
      label: newMilestoneLabel.trim(),
      badge: newMilestoneBadge.trim() || '🎯',
      description: newMilestoneDesc.trim() || undefined,
    };

    const updated = [...milestones, newM].sort((a, b) => a.percentage - b.percentage);
    setMilestones(updated);
    setNewMilestonePct('');
    setNewMilestoneLabel('');
    setNewMilestoneBadge('🎯');
    setNewMilestoneDesc('');
    setShowAddMilestone(false);
    setErrorMsg(null);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleResetMilestones = () => {
    setMilestones(DEFAULT_MILESTONES);
  };

  // Live Broadcast Announcements Handlers
  const handleAddAnnouncement = () => {
    const trimmed = newAnnouncementInput.trim();
    if (!trimmed) return;
    if (announcements.includes(trimmed)) {
      setErrorMsg('This announcement is already on the broadcast ticker.');
      return;
    }
    setAnnouncements([...announcements, trimmed]);
    setNewAnnouncementInput('');
    setErrorMsg(null);
  };

  const handleRemoveAnnouncement = (index: number) => {
    setAnnouncements(announcements.filter((_, i) => i !== index));
  };

  const handleResetAnnouncements = () => {
    setAnnouncements(DEFAULT_ANNOUNCEMENTS);
  };

  // Main Save Handler
  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (target <= 0 || isNaN(target)) {
      setErrorMsg('Zonal campaign target must be a positive number.');
      return;
    }

    if (raceThresholdYellow >= raceThresholdGreen) {
      setErrorMsg('Yellow threshold must be lower than Green threshold.');
      return;
    }

    if (raceThresholdYellow <= 0 || raceThresholdGreen <= 0) {
      setErrorMsg('Threshold percentages must be greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        name: name.trim() || 'Reach Out Nigeria',
        eventDate,
        target: Math.round(target),
        status,
        description: description.trim(),
        raceThresholdYellow: Math.round(raceThresholdYellow),
        raceThresholdGreen: Math.round(raceThresholdGreen),
        milestones,
        milestoneInterval: Math.round(milestoneInterval),
        zonalMilestones: [5000, 10000, 20000, 25000].includes(milestoneInterval)
          ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((multiplier) => multiplier * milestoneInterval)
          : DEFAULT_ZONAL_MILESTONES,
        announcements,
      };

      const success = await saveSettings(updates);
      if (success) {
        setSuccessMsg('All campaign settings, milestones, and ticker announcements saved successfully!');
      } else {
        setErrorMsg('Failed to save settings. Please check your internet connection and try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="account-card" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div className="form-header" style={{ marginBottom: '24px' }}>
        <Sliders size={26} className="text-green-accent" />
        <div>
          <h2 className="form-title">CAMPAIGN & SYSTEM SETTINGS</h2>
          <p className="form-lead">
            Configure campaign identity, overall zonal target, race tier thresholds, and celebration milestone badges.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="error-box" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="success-box" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveAllSettings} className="space-y-6">
        {/* SECTION 1: CORE CAMPAIGN DETAILS */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={20} className="text-gold" />
            <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>
              1. CAMPAIGN CORE DETAILS
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">CAMPAIGN EVENT NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Reach Out Nigeria"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">CAMPAIGN DATE</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">TOTAL ZONAL TARGET (SOULS)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. 50000"
                className="form-input"
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                Overall campaign victory finish line.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">EVENT LIVE STATUS</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="form-input"
              >
                <option value="upcoming">UPCOMING (Countdown Mode)</option>
                <option value="live">● LIVE (Active Soul Winning & Race)</option>
                <option value="completed">COMPLETED (Final Totals Preserved)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">CAMPAIGN THEME / DESCRIPTION</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. CEAZ1 Reachout Nigeria Soul Winning Campaign taking place on October 1st, 2026."
              className="form-input"
            />
          </div>
        </div>

        {/* SECTION 2: RACE COLOR THRESHOLDS */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Layers size={20} className="text-green-accent" />
            <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>
              2. UPWARD RACE VISUALIZER COLOR THRESHOLDS
            </h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
            Tune the progress percentages where race bars transition from Red to Yellow, and from Yellow to Green across the Upward Race, Big Screen, and Leaderboards.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#ffd60a' }}>
                YELLOW TIER THRESHOLD (%)
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={raceThresholdYellow}
                onChange={(e) => setRaceThresholdYellow(parseInt(e.target.value, 10) || 50)}
                className="form-input"
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Bars below this % render in <strong>Red</strong>. Above this % render in <strong>Yellow</strong>.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#00ff87' }}>
                GREEN TIER THRESHOLD (%)
              </label>
              <input
                type="number"
                min="2"
                max="100"
                value={raceThresholdGreen}
                onChange={(e) => setRaceThresholdGreen(parseInt(e.target.value, 10) || 75)}
                className="form-input"
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Bars at or above this % render in <strong>Bright Green</strong>.
              </span>
            </div>
          </div>

          {/* Interactive Visual Preview */}
          <div
            style={{
              background: '#090d16',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>
              LIVE RACE TIER PREVIEW:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  flex: 1,
                  minWidth: '140px',
                  background: 'linear-gradient(180deg, #ff453a 0%, #b30000 100%)',
                  padding: '10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                }}
              >
                &lt; {raceThresholdYellow}% (RED TIER)
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: '140px',
                  background: 'linear-gradient(180deg, #ffcc00 0%, #b38f00 100%)',
                  padding: '10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#000000',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                }}
              >
                {raceThresholdYellow}% – {raceThresholdGreen - 1}% (YELLOW TIER)
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: '140px',
                  background: 'linear-gradient(180deg, #00ff87 0%, #00994d 100%)',
                  padding: '10px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#000000',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                }}
              >
                ≥ {raceThresholdGreen}% (GREEN TIER)
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: CAMPAIGN CELEBRATION MILESTONES & REWARD BADGES */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          {/* ZONAL CONFETTI MILESTONES CARD */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1.5px solid rgba(0, 135, 81, 0.35)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PartyPopper size={22} style={{ color: '#FFD700' }} />
                <div>
                  <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontWeight: 800 }}>
                    ZONAL CONFETTI CELEBRATION MILESTONES
                  </h4>
                  <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    Every connected screen (projectors, big screen, mobile) bursts with confetti whenever this milestone interval is reached.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsTriggeringConfetti(true);
                  try {
                    await triggerCelebration('SUPER ADMIN LIVE CELEBRATION TEST!');
                    setSuccessMsg('🎉 Live confetti celebration broadcast sent to all screens!');
                    setTimeout(() => setSuccessMsg(null), 4000);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsTriggeringConfetti(false);
                  }
                }}
                disabled={isTriggeringConfetti}
                style={{
                  background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)',
                  border: '1.5px solid #FFD700',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: isTriggeringConfetti ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(0, 135, 81, 0.3)',
                }}
              >
                <Sparkles size={16} style={{ color: '#FFD700' }} />
                <span>{isTriggeringConfetti ? 'Broadcasting...' : '🎉 Fire Confetti Now'}</span>
              </button>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1' }}>
                TRIGGER INTERVAL:
              </span>
              {[5000, 10000, 20000, 25000].map((val) => {
                const isActive = milestoneInterval === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMilestoneInterval(val)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: isActive ? '#008751' : 'rgba(255, 255, 255, 0.08)',
                      border: isActive ? '1.5px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: isActive ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    Every {val.toLocaleString()} Souls {isActive ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} className="text-gold" />
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>
                PERCENTAGE REWARD BADGES ({milestones.length})
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleResetMilestones}
                className="secondary-button"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                title="Reset to default 25%, 50%, 75%, 100%, 125% milestones"
              >
                <RotateCcw size={14} />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddMilestone(!showAddMilestone)}
                className="btn-green-accent"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <Plus size={14} />
                <span>{showAddMilestone ? 'Close' : 'Add Milestone'}</span>
              </button>
            </div>
          </div>

          {/* Add Milestone Form */}
          {showAddMilestone && (
            <div
              style={{
                background: 'rgba(0, 135, 81, 0.1)',
                border: '1px solid rgba(0, 255, 135, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <h4 style={{ color: '#00ff87', fontSize: '0.9rem', margin: '0 0 12px 0', fontWeight: '700' }}>
                ADD NEW CELEBRATION MILESTONE
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="form-label">PERCENTAGE (%)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMilestonePct}
                    onChange={(e) => setNewMilestonePct(e.target.value)}
                    placeholder="e.g. 50"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">TITLE / LABEL</label>
                  <input
                    type="text"
                    value={newMilestoneLabel}
                    onChange={(e) => setNewMilestoneLabel(e.target.value)}
                    placeholder="e.g. Silver Stride"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">BADGE ICON / EMOJI</label>
                  <input
                    type="text"
                    value={newMilestoneBadge}
                    onChange={(e) => setNewMilestoneBadge(e.target.value)}
                    placeholder="e.g. 🥈, 🏆, ⭐"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">SHORT DESCRIPTION</label>
                  <input
                    type="text"
                    value={newMilestoneDesc}
                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    placeholder="e.g. Halfway to victory"
                    className="form-input"
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="secondary-button"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="submit-button"
                  style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                >
                  Add Milestone
                </button>
              </div>
            </div>
          )}

          {/* Milestones List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {milestones.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{m.badge || '🎯'}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '800', color: '#00ff87', fontSize: '0.95rem' }}>
                        {m.percentage}%
                      </span>
                      <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.9rem' }}>
                        {m.label}
                      </span>
                    </div>
                    {m.description && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.description}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMilestone(m.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Remove Milestone"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: LIVE BROADCAST ANNOUNCEMENTS (RUNNING TICKER) */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={20} className="text-gold" />
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>
                4. LIVE BROADCAST ANNOUNCEMENTS ({announcements.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetAnnouncements}
              className="secondary-button"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="Reset to default campaign announcements"
            >
              <RotateCcw size={14} />
              <span>Reset Defaults</span>
            </button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
            These messages appear in the live running news ticker at the bottom of the screen and on the Big Screen projector view.
          </p>

          {/* Add Announcement Input */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newAnnouncementInput}
              onChange={(e) => setNewAnnouncementInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAnnouncement();
                }
              }}
              placeholder="e.g. 📢 CE Kubwa has passed 85% of target! Keep the souls flowing!"
              className="form-input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAddAnnouncement}
              className="btn-green-accent"
              style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Announcements List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {announcements.map((ann, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 215, 0, 0.05)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f5b700', minWidth: '24px' }}>
                    #{idx + 1}
                  </span>
                  <span style={{ color: '#e2e8f0', fontSize: '0.88rem', fontWeight: '500' }}>
                    {ann}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAnnouncement(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Remove Announcement"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-green-accent btn-large"
            style={{ minWidth: '220px', padding: '14px 28px', fontSize: '1rem', fontWeight: '800' }}
          >
            <Save size={20} />
            <span>{isSaving ? 'SAVING CHANGES...' : 'SAVE ALL CAMPAIGN SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
