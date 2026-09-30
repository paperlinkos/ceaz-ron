import React, { useState, useEffect } from 'react';
import {
  PartyPopper,
  Sparkles,
  CheckCircle2,
  Bell,
  Clock,
  Send,
  Church,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import {
  subscribeToMilestoneAlerts,
  releaseMilestoneCelebration,
  dismissMilestoneAlert,
  triggerDirectEntityCelebration,
  evaluateAndGenerateMilestones,
} from '../../services/smartMilestoneService';
import type { MilestoneAlert } from '../../config/eventConfig';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { getChurches, getGroups } from '../../services/organizationService';
import { getTargets } from '../../services/targetService';
import { useAuth } from '../../context/AuthContext';

export const MilestoneCelebrationManager: React.FC = () => {
  const { userProfile } = useAuth();

  const [alerts, setAlerts] = useState<MilestoneAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'released' | 'manual'>('pending');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [releasingAlertId, setReleasingAlertId] = useState<string | null>(null);
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Manual broadcaster state
  const [manualEntityType, setManualEntityType] = useState<'church' | 'group'>('church');
  const [allChurches, setAllChurches] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [manualHeadline, setManualHeadline] = useState<string>('');
  const [manualMessage, setManualMessage] = useState<string>('');
  const [isBroadcastingManual, setIsBroadcastingManual] = useState<boolean>(false);

  // 1. Subscribe to live Firestore milestone alerts
  useEffect(() => {
    const unsubscribe = subscribeToMilestoneAlerts((incomingAlerts) => {
      setAlerts(incomingAlerts);
    });

    // Load churches & groups for dropdown
    Promise.all([getChurches(), getGroups()]).then(([c, g]) => {
      setAllChurches(c);
      setAllGroups(g);
      if (c.length > 0) setSelectedEntityId(c[0].id);
    });

    return () => unsubscribe();
  }, []);

  // 2. Trigger scan across all organizations
  const handleScanMilestones = async () => {
    setIsScanning(true);
    try {
      const [records, churches, groups, targets] = await Promise.all([
        getAllLocalRecords(),
        getChurches(),
        getGroups(),
        getTargets(),
      ]);

      await evaluateAndGenerateMilestones(records, churches, groups, targets);
      setSuccessBanner('Smart milestone scan complete! Latest alerts updated.');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      console.error('Failed to scan milestones:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Release an alert to all live screens
  const handleRelease = async (alert: MilestoneAlert) => {
    setReleasingAlertId(alert.id);
    try {
      const customMsg = customMessages[alert.id];
      const success = await releaseMilestoneCelebration(
        alert,
        customMsg,
        userProfile?.id || 'superAdmin'
      );

      if (success) {
        setSuccessBanner(`🎉 Successfully released celebration for ${alert.entityName}! Broadcasted live to all screens.`);
        setTimeout(() => setSuccessBanner(null), 5000);
      }
    } catch (err) {
      console.error('Error releasing alert:', err);
    } finally {
      setReleasingAlertId(null);
    }
  };

  // 4. Dismiss an alert
  const handleDismiss = async (alertId: string) => {
    await dismissMilestoneAlert(alertId, userProfile?.id || 'superAdmin');
  };

  // 5. Broadcast direct manual celebration
  const handleBroadcastDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityId) return;

    setIsBroadcastingManual(true);
    try {
      let entityName = '';
      let groupName = '';

      if (manualEntityType === 'church') {
        const found = allChurches.find((c) => c.id === selectedEntityId);
        entityName = found?.name || 'Selected Church';
        const grp = allGroups.find((g) => g.id === found?.groupId);
        groupName = grp?.name || 'Abuja Zone 1';
      } else {
        const found = allGroups.find((g) => g.id === selectedEntityId);
        entityName = found?.name || 'Selected Group';
        groupName = 'Abuja Zone 1';
      }

      const headline = manualHeadline.trim() || `${entityName.toUpperCase()} SPECIAL CELEBRATION!`;
      const message = manualMessage.trim() || `Glorious achievements recorded in ${entityName}! Keep up the mighty harvest!`;

      const success = await triggerDirectEntityCelebration({
        entityType: manualEntityType,
        entityName,
        groupName,
        headline,
        message,
        actorId: userProfile?.id || 'superAdmin',
      });

      if (success) {
        setSuccessBanner(`🎉 Custom celebration for ${entityName} broadcast live to the hall!`);
        setManualMessage('');
        setManualHeadline('');
        setTimeout(() => setSuccessBanner(null), 5000);
      }
    } catch (err) {
      console.error('Failed to broadcast custom celebration:', err);
    } finally {
      setIsBroadcastingManual(false);
    }
  };

  const pendingAlerts = alerts.filter((a) => a.status === 'pending');
  const releasedAlerts = alerts.filter((a) => a.status === 'released');

  return (
    <div
      className="milestone-manager-container"
      style={{
        background: 'linear-gradient(135deg, rgba(7, 23, 16, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1.5px solid rgba(0, 135, 81, 0.4)',
        borderRadius: '16px',
        padding: '24px',
        color: '#ffffff',
        marginBottom: '24px',
        boxShadow: '0 12px 35px rgba(0,0,0,0.35)',
      }}
    >
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255, 215, 0, 0.15)',
              border: '1.5px solid rgba(255, 215, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFD700',
            }}
          >
            <PartyPopper size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.02em', color: '#ffffff' }}>
                SMART MILESTONES & CELEBRATION COMMAND CENTER
              </h2>
              {pendingAlerts.length > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    animation: 'pulse 2s infinite',
                  }}
                >
                  {pendingAlerts.length} NEW
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
              Review church & group targets hit, customize commendation messages, and broadcast real-time celebrations to all screens.
            </p>
          </div>
        </div>

        {/* SCAN BUTTON */}
        <button
          type="button"
          onClick={handleScanMilestones}
          disabled={isScanning}
          style={{
            background: 'rgba(0, 135, 81, 0.25)',
            border: '1px solid #00ff87',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#00ff87',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
          }}
          title="Scan current database numbers for newly met targets"
        >
          <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
          <span>{isScanning ? 'SCANNING...' : 'SCAN FOR NEW MILESTONES'}</span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {successBanner && (
        <div
          style={{
            background: 'rgba(0, 135, 81, 0.25)',
            border: '1px solid #00ff87',
            borderRadius: '8px',
            padding: '10px 16px',
            color: '#00ff87',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '18px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* SUBTABS */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? 'rgba(0, 135, 81, 0.4)' : 'transparent',
            border: activeTab === 'pending' ? '1px solid #00ff87' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            color: activeTab === 'pending' ? '#00ff87' : '#94a3b8',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bell size={15} />
          <span>PENDING RELEASE ({pendingAlerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          style={{
            background: activeTab === 'manual' ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
            border: activeTab === 'manual' ? '1px solid #FFD700' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            color: activeTab === 'manual' ? '#FFD700' : '#94a3b8',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={15} />
          <span>CUSTOM CHURCH CELEBRATION</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('released')}
          style={{
            background: activeTab === 'released' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: activeTab === 'released' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            color: activeTab === 'released' ? '#ffffff' : '#94a3b8',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Clock size={15} />
          <span>RELEASED HISTORY ({releasedAlerts.length})</span>
        </button>
      </div>

      {/* TAB 1: PENDING MILESTONE RELEASE QUEUE */}
      {activeTab === 'pending' && (
        <div className="pending-alerts-list">
          {pendingAlerts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.15)',
              }}
            >
              <CheckCircle2 size={36} style={{ color: '#00ff87', margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>No Pending Milestone Alerts</h4>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                All church and group milestone achievements are up-to-date. Click <strong>"SCAN FOR NEW MILESTONES"</strong> or broadcast a custom celebration below.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingAlerts.map((alert) => {
                const isChurch = alert.entityType === 'church';
                const isReleasing = releasingAlertId === alert.id;

                return (
                  <div
                    key={alert.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: alert.milestoneValue >= 100 ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(0, 135, 81, 0.4)',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: alert.milestoneValue >= 100 ? '0 0 20px rgba(255, 215, 0, 0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: isChurch ? 'rgba(0, 135, 81, 0.2)' : 'rgba(255, 215, 0, 0.15)',
                            border: isChurch ? '1px solid #00ff87' : '1px solid #FFD700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isChurch ? '#00ff87' : '#FFD700',
                            flexShrink: 0,
                          }}
                        >
                          {isChurch ? <Church size={22} /> : <Trophy size={22} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: alert.milestoneValue >= 100 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 135, 81, 0.3)',
                                color: alert.milestoneValue >= 100 ? '#FFD700' : '#4ade80',
                                border: alert.milestoneValue >= 100 ? '1px solid #FFD700' : '1px solid #008751',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              {alert.entityType.toUpperCase()} MILESTONE
                            </span>
                            {alert.groupName && (
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                                Group: <strong>{alert.groupName}</strong>
                              </span>
                            )}
                          </div>

                          <h3 style={{ margin: '4px 0 2px 0', fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
                            {alert.headline}
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                            {alert.subheadline}
                          </p>
                        </div>
                      </div>

                      {/* STAT PILL */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          textAlign: 'right',
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>SOULS / TARGET</div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#00ff87' }}>
                          {alert.actual.toLocaleString()}{' '}
                          <span style={{ color: '#64748b' }}>/</span>{' '}
                          <span style={{ color: '#FFD700' }}>{alert.target.toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 800 }}>
                          {alert.percentage}% Achieved
                        </div>
                      </div>
                    </div>

                    {/* CUSTOMIZABLE CELEBRATION MESSAGE INPUT */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`Custom commendation message (optional) — e.g. "Congratulations to the brethren of ${alert.entityName}!"`}
                        value={customMessages[alert.id] ?? alert.subheadline}
                        onChange={(e) =>
                          setCustomMessages((prev) => ({ ...prev, [alert.id]: e.target.value }))
                        }
                        style={{
                          flex: 1,
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleDismiss(alert.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '7px 14px',
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Dismiss
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRelease(alert)}
                        disabled={isReleasing}
                        style={{
                          background: 'linear-gradient(135deg, #008751 0%, #00b36b 100%)',
                          border: '1.5px solid #FFD700',
                          borderRadius: '8px',
                          padding: '8px 18px',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: isReleasing ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 15px rgba(0, 135, 81, 0.4), 0 0 10px rgba(255, 215, 0, 0.25)',
                        }}
                      >
                        <Sparkles size={16} style={{ color: '#FFD700' }} />
                        <span>{isReleasing ? 'BROADCASTING...' : '🎉 RELEASE CELEBRATION TO SCREENS'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL CUSTOM CHURCH CELEBRATION FORM */}
      {activeTab === 'manual' && (
        <form onSubmit={handleBroadcastDirect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
            Choose any specific Church or Group to celebrate on the stage and broadcast full-screen confetti in real-time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* Entity Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                CELEBRATE A:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setManualEntityType('church');
                    if (allChurches.length > 0) setSelectedEntityId(allChurches[0].id);
                  }}
                  style={{
                    flex: 1,
                    background: manualEntityType === 'church' ? 'rgba(0, 135, 81, 0.4)' : 'rgba(255,255,255,0.05)',
                    border: manualEntityType === 'church' ? '1.5px solid #00ff87' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '8px',
                    color: manualEntityType === 'church' ? '#00ff87' : '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Church
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualEntityType('group');
                    if (allGroups.length > 0) setSelectedEntityId(allGroups[0].id);
                  }}
                  style={{
                    flex: 1,
                    background: manualEntityType === 'group' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: manualEntityType === 'group' ? '1.5px solid #FFD700' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '8px',
                    color: manualEntityType === 'group' ? '#FFD700' : '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Group
                </button>
              </div>
            </div>

            {/* Entity Select Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                SELECT {manualEntityType.toUpperCase()}:
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              >
                {manualEntityType === 'church'
                  ? allChurches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  : allGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Headline Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
              CELEBRATION HEADLINE (OPTIONAL):
            </label>
            <input
              type="text"
              placeholder="e.g. CHRIST EMBASSY DURUMI — GLORIOUS TARGET EXCEEDED!"
              value={manualHeadline}
              onChange={(e) => setManualHeadline(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Commendation Message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
              COMMENDATION / ENCOURAGEMENT MESSAGE:
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Congratulations to the Pastor, Leaders, and brethren for a sensational harvest of souls! Keep winning!"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={isBroadcastingManual}
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #ffaa00 100%)',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 22px',
                color: '#000000',
                fontWeight: 900,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isBroadcastingManual ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(255, 215, 0, 0.35)',
              }}
            >
              <Send size={16} />
              <span>{isBroadcastingManual ? 'BROADCASTING...' : '🎉 BROADCAST CUSTOM CELEBRATION NOW'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: RELEASED HISTORY */}
      {activeTab === 'released' && (
        <div>
          {releasedAlerts.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>
              No celebrations have been released yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {releasedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                      {alert.headline}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {alert.subheadline}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: 'rgba(0, 135, 81, 0.2)',
                        color: '#4ade80',
                        border: '1px solid rgba(0, 135, 81, 0.5)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Released
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRelease(alert)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                        color: '#FFD700',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Re-broadcast this celebration"
                    >
                      Re-broadcast
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
