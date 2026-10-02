import React, { useState, useEffect, useMemo } from 'react';
import { Swords, Trophy, Flame, RefreshCw, Crown, Sparkles, Award, Shield } from 'lucide-react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { subscribeToSyncStatus } from '../../services/syncService';
import { getOfficialTarget } from '../../services/targetService';
import type { SoulWinningRecord } from '../../types/record';

export interface PCFArenaViewProps {
  isBigScreen?: boolean;
  records?: SoulWinningRecord[];
}

export type ArenaTab = 'all' | 'service-1' | 'service-2';

export interface PCFStat {
  id: string;
  name: string;
  service: 'service-1' | 'service-2';
  serviceLabel: string;
  soulsWon: number;
  percentageOfService: number;
  color: string;
  glowColor: string;
  emoji: string;
}

/**
 * Normalizes raw PCF IDs and names from Firestore into official human-readable names.
 * Handles database keys like pcf-zc2-huois (Huios PCF), pcf-zc1-kinging (Kinging PCF),
 * pcf-zc2-bitw (BITW PCF), pcf-zc1-exclusive (Exclusive PCF), etc.
 */
export function formatPCFName(rawIdOrName?: string): string | null {
  if (!rawIdOrName) return null;
  let s = rawIdOrName.trim();
  if (!s || s === '—' || s.toLowerCase() === 'none' || s.toLowerCase() === '(no pcf)') return null;

  // Strip prefix like pcf-zc1- or pcf-zc2- or pcf-
  if (s.toLowerCase().startsWith('pcf-')) {
    s = s.replace(/^pcf-(?:zc[12]-)?/i, '');
  }

  const lower = s.toLowerCase();
  // Voice transcription & phonetic corrections (e.g. "huois" in database -> Huios PCF)
  if (lower === 'huois' || lower === 'huios' || lower.includes('huois') || lower.includes('huios')) {
    return 'Huios PCF';
  }
  if (lower === 'bitw' || lower.includes('bitw')) {
    return 'BITW PCF';
  }
  if (lower === 'pre-eminent' || lower === 'preeminent') {
    return 'Pre-eminent PCF';
  }
  if (lower === 'men-of-valor' || lower === 'men of valor') {
    return 'Men of Valor PCF';
  }
  if (lower === 'city-of-light' || lower === 'city of light') {
    return 'City of Light PCF';
  }
  if (lower === 'phenomenal' || lower.includes('phenomenal')) {
    return 'Phenomenal Grace PCF';
  }
  if (lower === 'exclusive' || lower === 'exclusive pcf') {
    return 'Exclusive PCF';
  }
  if (lower === 'virtuous-pillars' || lower.includes('virtuous pillars')) {
    return 'Virtuous Pillars PCF';
  }
  if (lower === 'amazing-women' || lower.includes('amazing women')) {
    return 'Amazing Women PCF';
  }
  if (lower === 'limitless-grace' || lower.includes('limitless grace')) {
    return 'Limitless Grace PCF';
  }
  if (lower === 'prime-haven' || lower.includes('prime haven')) {
    return 'Prime Haven PCF';
  }
  if (lower === 'gracious-haven' || lower.includes('gracious haven')) {
    return 'Gracious Haven PCF';
  }
  if (lower === 'great-grace' || lower.includes('great grace')) {
    return 'Great Grace PCF';
  }
  if (lower === 'extravagant-grace' || lower.includes('extravagant grace')) {
    return 'Extravagant Grace PCF';
  }
  if (lower === 'creative-outreach' || lower.includes('creative outreach')) {
    return 'Creative Outreach PCF';
  }
  if (lower === 'elite-haven' || lower.includes('elite haven')) {
    return 'Elite Haven PCF';
  }
  if (lower === 'anointed-champions' || lower.includes('anointed champions')) {
    return 'Anointed Champions PCF';
  }
  if (lower === 'radiant-ladies' || lower.includes('radiant ladies')) {
    return 'Radiant Ladies PCF';
  }
  if (lower === 'business-strategic' || lower.includes('business strategic')) {
    return 'Business Strategic PCF';
  }
  if (lower === 'light-bearers' || lower.includes('light bearers')) {
    return 'Light Bearers PCF';
  }
  if (lower === 'vibrant-generation' || lower.includes('vibrant generation')) {
    return 'Vibrant Generation PCF';
  }
  if (lower === 'luxuriant-growth' || lower.includes('luxuriant growth')) {
    return 'Luxuriant Growth PCF';
  }

  // Already ends with PCF
  if (lower.endsWith('pcf')) {
    return s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const title = s.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `${title} PCF`;
}

function classifyRecordService(r: SoulWinningRecord): 'service-1' | 'service-2' | null {
  const pid = (r.pcfId || '').toLowerCase();
  const cid = (r.churchId || '').toLowerCase();
  const cname = (r.churchName || '').toLowerCase();
  const email = (r.uploadedByEmail || '').toLowerCase();

  // 1. Check pcfId prefix (e.g. pcf-zc1-..., pcf-zc2-...)
  if (pid.startsWith('pcf-zc1-')) return 'service-1';
  if (pid.startsWith('pcf-zc2-')) return 'service-2';

  // 2. Explicit Service 1 matches
  if (
    cid === 'ch-zonal-church-1' ||
    cid === 'ch-service-1' ||
    cid === 'ch-znc1' ||
    cid.includes('znc1') ||
    cid.includes('service-1') ||
    cname.includes('zonal church 1') ||
    cname.includes('service 1') ||
    email.includes('ch-znc1') ||
    email.includes('znc1')
  ) {
    return 'service-1';
  }

  // 3. Explicit Service 2 matches
  if (
    cid === 'ch-zonal-church-2' ||
    cid === 'ch-service-2' ||
    cid === 'ch-znc2' ||
    cid.includes('znc2') ||
    cid.includes('service-2') ||
    cname.includes('zonal church 2') ||
    cname.includes('service 2') ||
    email.includes('ch-znc2') ||
    email.includes('znc2')
  ) {
    return 'service-2';
  }

  return null;
}

function extractRecordPCF(r: SoulWinningRecord): string | null {
  // Check both pcfName and pcfId
  const raw = (r.pcfName && r.pcfName.trim()) || (r.pcfId && r.pcfId.trim()) || '';
  if (!raw || raw === '—' || raw.toLowerCase() === 'none') {
    if (r.notes) {
      const match = r.notes.match(/(?:pcf|unit):\s*([^\n,;]+)/i);
      if (match) return formatPCFName(match[1]);
    }
    return null;
  }
  return formatPCFName(raw);
}

// Color palettes for PCF cards
const PCF_GRADIENTS = [
  { color: 'linear-gradient(135deg, #008751 0%, #005c37 100%)', glowColor: 'rgba(0, 135, 81, 0.4)', emoji: '🔥' },
  { color: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', glowColor: 'rgba(124, 58, 237, 0.4)', emoji: '⚡' },
  { color: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', glowColor: 'rgba(217, 119, 6, 0.4)', emoji: '👑' },
  { color: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', glowColor: 'rgba(2, 132, 199, 0.4)', emoji: '✨' },
  { color: 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)', glowColor: 'rgba(225, 29, 72, 0.4)', emoji: '💎' },
  { color: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', glowColor: 'rgba(5, 150, 105, 0.4)', emoji: '🌟' },
];

export const PCFArenaView: React.FC<PCFArenaViewProps> = ({ isBigScreen = false, records: propRecords }) => {
  const [internalRecords, setInternalRecords] = useState<SoulWinningRecord[]>([]);
  const [activeTab, setActiveTab] = useState<ArenaTab>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load records from local IndexedDB + Firestore when not supplied by parent
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const localRecords = await getAllLocalRecords();
      const recordMap = new Map<string, SoulWinningRecord>();

      localRecords.forEach((rec) => {
        recordMap.set(rec.id, rec);
      });

      if (navigator.onLine) {
        try {
          const snap = await getDocs(query(collection(db, 'soulWinningRecords')));
          snap.docs.forEach((d) => {
            const data = d.data() as SoulWinningRecord;
            const docId = data.id || d.id;
            recordMap.set(docId, { ...(recordMap.get(docId) || {}), ...data });
          });
        } catch (e) {
          console.warn('[PCFArenaView] Firestore getDocs warn:', e);
        }
      }

      setInternalRecords(Array.from(recordMap.values()));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('PCF Arena: Failed to load records', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (propRecords && propRecords.length > 0) {
      setInternalRecords(propRecords);
      return;
    }

    loadData();

    const unsubscribeSync = subscribeToSyncStatus(loadData);
    const handleRecordChange = () => loadData();
    window.addEventListener('ron_record_change', handleRecordChange);
    window.addEventListener('storage', handleRecordChange);

    let unsubscribeFirestore: (() => void) | undefined;
    if (navigator.onLine) {
      try {
        const q = query(collection(db, 'soulWinningRecords'));
        unsubscribeFirestore = onSnapshot(
          q,
          (snapshot) => {
            const recordMap = new Map<string, SoulWinningRecord>();
            snapshot.docs.forEach((d) => {
              const data = d.data() as SoulWinningRecord;
              const docId = data.id || d.id;
              recordMap.set(docId, data);
            });
            getAllLocalRecords().then((locals) => {
              locals.forEach((loc) => {
                if (!recordMap.has(loc.id)) {
                  recordMap.set(loc.id, loc);
                }
              });
              setInternalRecords(Array.from(recordMap.values()));
              setLastRefreshed(new Date());
            });
          },
          (err) => console.warn('[PCFArenaView] onSnapshot warn:', err)
        );
      } catch (e) {
        console.warn('[PCFArenaView] Firestore setup error:', e);
      }
    }

    return () => {
      unsubscribeSync();
      window.removeEventListener('ron_record_change', handleRecordChange);
      window.removeEventListener('storage', handleRecordChange);
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [propRecords]);

  const activeRecords = (propRecords && propRecords.length > 0) ? propRecords : internalRecords;

  // Compute Head-to-Head & complete PCF breakdown
  const {
    service1Souls,
    service2Souls,
    service1Target,
    service2Target,
    service1Pct,
    service2Pct,
    service1PCFs,
    service2PCFs,
    service1Unassigned,
    service2Unassigned,
    combinedPCFs,
    leaderService,
    leadMargin,
    clashRatio1,
    clashRatio2,
  } = useMemo(() => {
    const s1List: SoulWinningRecord[] = [];
    const s2List: SoulWinningRecord[] = [];

    activeRecords.forEach((r) => {
      const s = classifyRecordService(r);
      if (s === 'service-1') s1List.push(r);
      else if (s === 'service-2') s2List.push(r);
    });

    const s1Souls = s1List.length;
    const s2Souls = s2List.length;

    const s1Target = getOfficialTarget('church', 'ch-zonal-church-1') || 3500;
    const s2Target = getOfficialTarget('church', 'ch-zonal-church-2') || 3500;

    const s1Pct = Math.round((s1Souls / (s1Target || 1)) * 100);
    const s2Pct = Math.round((s2Souls / (s2Target || 1)) * 100);

    // Aggregate Service 1 PCFs
    const s1PcfCounts: Record<string, number> = {};
    let s1Unassigned = 0;

    s1List.forEach((r) => {
      const pcfName = extractRecordPCF(r);
      if (pcfName) {
        s1PcfCounts[pcfName] = (s1PcfCounts[pcfName] || 0) + 1;
      } else {
        s1Unassigned++;
      }
    });

    const s1PcfList: PCFStat[] = Object.entries(s1PcfCounts)
      .map(([name, count], index) => {
        const theme = PCF_GRADIENTS[index % PCF_GRADIENTS.length];
        return {
          id: `s1-${name}`,
          name,
          service: 'service-1' as const,
          serviceLabel: 'Service 1',
          soulsWon: count,
          percentageOfService: s1Souls > 0 ? Math.round((count / s1Souls) * 100) : 0,
          color: theme.color,
          glowColor: theme.glowColor,
          emoji: theme.emoji,
        };
      })
      .sort((a, b) => b.soulsWon - a.soulsWon || a.name.localeCompare(b.name));

    // Aggregate Service 2 PCFs
    const s2PcfCounts: Record<string, number> = {};
    let s2Unassigned = 0;

    s2List.forEach((r) => {
      const pcfName = extractRecordPCF(r);
      if (pcfName) {
        s2PcfCounts[pcfName] = (s2PcfCounts[pcfName] || 0) + 1;
      } else {
        s2Unassigned++;
      }
    });

    const s2PcfList: PCFStat[] = Object.entries(s2PcfCounts)
      .map(([name, count], index) => {
        const theme = PCF_GRADIENTS[(index + 2) % PCF_GRADIENTS.length];
        return {
          id: `s2-${name}`,
          name,
          service: 'service-2' as const,
          serviceLabel: 'Service 2',
          soulsWon: count,
          percentageOfService: s2Souls > 0 ? Math.round((count / s2Souls) * 100) : 0,
          color: theme.color,
          glowColor: theme.glowColor,
          emoji: theme.emoji,
        };
      })
      .sort((a, b) => b.soulsWon - a.soulsWon || a.name.localeCompare(b.name));

    // Combined all real PCFs across both services
    const allPcfs = [...s1PcfList, ...s2PcfList].sort((a, b) => b.soulsWon - a.soulsWon);

    // Leader & battle clash percentages
    const totalClash = s1Souls + s2Souls;
    const clash1 = totalClash > 0 ? Math.round((s1Souls / totalClash) * 100) : 50;
    const clash2 = totalClash > 0 ? 100 - clash1 : 50;

    let leader: 'service-1' | 'service-2' | 'tied' = 'tied';
    let margin = 0;
    if (s1Souls > s2Souls) {
      leader = 'service-1';
      margin = s1Souls - s2Souls;
    } else if (s2Souls > s1Souls) {
      leader = 'service-2';
      margin = s2Souls - s1Souls;
    }

    return {
      service1Souls: s1Souls,
      service2Souls: s2Souls,
      service1Target: s1Target,
      service2Target: s2Target,
      service1Pct: s1Pct,
      service2Pct: s2Pct,
      service1PCFs: s1PcfList,
      service2PCFs: s2PcfList,
      service1Unassigned: s1Unassigned,
      service2Unassigned: s2Unassigned,
      combinedPCFs: allPcfs,
      leaderService: leader,
      leadMargin: margin,
      clashRatio1: clash1,
      clashRatio2: clash2,
    };
  }, [activeRecords]);

  const maxPCF1Souls = Math.max(...service1PCFs.map((p) => p.soulsWon), 1);
  const maxPCF2Souls = Math.max(...service2PCFs.map((p) => p.soulsWon), 1);
  const maxAllSouls = Math.max(...combinedPCFs.map((p) => p.soulsWon), 1);
  const totalCombinedSouls = service1Souls + service2Souls;

  return (
    <div
      className="public-home-container pcf-arena-wrapper"
      style={{
        maxWidth: isBigScreen ? '100%' : '1100px',
        margin: '0 auto',
        padding: isBigScreen ? '8px 16px' : '20px 16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* HEADER HERO */}
      <div
        style={{
          background: 'linear-gradient(135deg, #071710 0%, #0d2a1d 100%)',
          borderRadius: '20px',
          padding: '24px 28px 20px',
          marginBottom: '20px',
          border: '1px solid rgba(0,135,81,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                background: 'rgba(217,119,6,0.18)',
                border: '1px solid rgba(217,119,6,0.4)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                boxShadow: '0 0 16px rgba(217,119,6,0.25)',
              }}
            >
              <Swords size={26} style={{ color: '#FFD700' }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  color: '#FFD700',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontFamily: "'Orbitron', sans-serif",
                }}
              >
                ZONAL CHURCH BATTLEFIELD · HEAD-TO-HEAD
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.5rem, 3.2vw, 2.2rem)',
                  fontWeight: '900',
                  color: '#ffffff',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: '0.04em',
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                }}
              >
                PCF ARENA
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '0.80rem',
                fontWeight: '800',
                color: '#ffffff',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              REFRESH
            </button>
          </div>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '10px 0 0', lineHeight: 1.5 }}>
          Official head-to-head clash between <strong>Service 1 (Zonal Church 1)</strong> and <strong>Service 2 (Zonal Church 2)</strong>, tracking all registered PCFs with real-time database synchronisation.
        </p>
      </div>

      {/* SEGMENTED SERVICE TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ffffff',
          padding: '6px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {[
          { id: 'all', label: 'ALL SERVICES', count: service1Souls + service2Souls, icon: Swords },
          { id: 'service-1', label: 'SERVICE 1 (ZONAL CHURCH 1)', count: service1Souls, icon: Sparkles },
          { id: 'service-2', label: 'SERVICE 2 (ZONAL CHURCH 2)', count: service2Souls, icon: Trophy },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ArenaTab)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#008751' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: "'Orbitron', sans-serif",
                boxShadow: isActive ? '0 4px 12px rgba(0,135,81,0.3)' : 'none',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#0f172a',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {tab.count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* THE HEAD-TO-HEAD CLASH CARD ("THIS VERSUS THIS") */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '24px 20px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: '20px',
              padding: '4px 16px',
              fontSize: '0.78rem',
              fontWeight: '900',
              color: '#d97706',
              letterSpacing: '0.08em',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            <Flame size={14} style={{ color: '#ea580c' }} />
            {leaderService === 'service-1' && `SERVICE 1 LEADS BY +${leadMargin.toLocaleString()} SOULS`}
            {leaderService === 'service-2' && `SERVICE 2 LEADS BY +${leadMargin.toLocaleString()} SOULS`}
            {leaderService === 'tied' && (service1Souls > 0 ? `DEAD HEAT · TIED AT ${service1Souls.toLocaleString()} SOULS` : 'CLASH COMMENCING · 0 SOULS WON')}
          </div>
        </div>

        {/* 3-COLUMN BATTLE BANNER */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* SERVICE 1 CORNER */}
          <div
            style={{
              background: activeTab === 'service-1' || leaderService === 'service-1' ? 'rgba(0, 135, 81, 0.05)' : '#f8fafc',
              border: `2px solid ${leaderService === 'service-1' ? '#008751' : '#e2e8f0'}`,
              borderRadius: '16px',
              padding: '18px 16px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: leaderService === 'service-1' ? '0 4px 16px rgba(0, 135, 81, 0.18)' : 'none',
            }}
          >
            {leaderService === 'service-1' && (
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#008751',
                  color: '#ffffff',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: '900',
                  letterSpacing: '0.08em',
                  fontFamily: "'Orbitron', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Crown size={12} /> LEADING
              </div>
            )}
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ZONAL CHURCH 1 · CH-ZNC1
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif", margin: '4px 0 2px' }}>
              SERVICE 1
            </div>
            <div
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: '900',
                color: '#008751',
                fontFamily: "'Orbitron', sans-serif",
                lineHeight: 1.1,
              }}
            >
              {service1Souls.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
              <strong>{service1Pct}%</strong> of {service1Target.toLocaleString()} target · {service1PCFs.length} PCFs
            </div>
          </div>

          {/* VS EMBLEM */}
          <div style={{ textAlign: 'center', padding: '0 8px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#FFD700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                border: '2px solid rgba(255, 215, 0, 0.4)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                fontWeight: '900',
                fontSize: '1rem',
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              VS
            </div>
          </div>

          {/* SERVICE 2 CORNER */}
          <div
            style={{
              background: activeTab === 'service-2' || leaderService === 'service-2' ? 'rgba(217, 119, 6, 0.05)' : '#f8fafc',
              border: `2px solid ${leaderService === 'service-2' ? '#d97706' : '#e2e8f0'}`,
              borderRadius: '16px',
              padding: '18px 16px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: leaderService === 'service-2' ? '0 4px 16px rgba(217, 119, 6, 0.18)' : 'none',
            }}
          >
            {leaderService === 'service-2' && (
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#d97706',
                  color: '#ffffff',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: '900',
                  letterSpacing: '0.08em',
                  fontFamily: "'Orbitron', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Crown size={12} /> LEADING
              </div>
            )}
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ZONAL CHURCH 2 · CH-ZNC2
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif", margin: '4px 0 2px' }}>
              SERVICE 2
            </div>
            <div
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: '900',
                color: '#d97706',
                fontFamily: "'Orbitron', sans-serif",
                lineHeight: 1.1,
              }}
            >
              {service2Souls.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
              <strong>{service2Pct}%</strong> of {service2Target.toLocaleString()} target · {service2PCFs.length} PCFs
            </div>
          </div>
        </div>

        {/* TUG-OF-WAR CLASH PROGRESS BAR */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: '800', marginBottom: '6px' }}>
            <span style={{ color: '#008751', fontFamily: "'Orbitron', sans-serif" }}>
              SERVICE 1 ({clashRatio1}%)
            </span>
            <span style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              SOUL HARVEST SHARE
            </span>
            <span style={{ color: '#d97706', fontFamily: "'Orbitron', sans-serif" }}>
              SERVICE 2 ({clashRatio2}%)
            </span>
          </div>

          <div
            style={{
              height: '14px',
              borderRadius: '8px',
              background: '#e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                width: `${clashRatio1}%`,
                background: 'linear-gradient(90deg, #008751 0%, #00d68f 100%)',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            <div
              style={{
                width: `${clashRatio2}%`,
                background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 1. ALL SERVICES TAB: COMBINED HIERARCHY OF ALL 42 PCFS */}
      {activeTab === 'all' && (
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '2px solid rgba(0, 135, 81, 0.25)',
              paddingBottom: '8px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: '900',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <Swords size={20} style={{ color: '#008751' }} />
              COMBINED PCF HIERARCHY & STANDINGS
              <span
                style={{
                  background: 'rgba(0, 135, 81, 0.1)',
                  color: '#008751',
                  borderRadius: '20px',
                  padding: '2px 10px',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {combinedPCFs.length} PCFs · {totalCombinedSouls.toLocaleString()} SOULS TOTAL
              </span>
            </h2>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>
              Unified ranking across Service 1 & Service 2
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {combinedPCFs.map((pcf, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              const medal = idx < 3 ? medals[idx] : `#${idx + 1}`;
              const barWidth = Math.max(4, Math.round((pcf.soulsWon / maxAllSouls) * 100));
              const isFirst = idx === 0 && pcf.soulsWon > 0;
              const isService1 = pcf.service === 'service-1';
              const shareOfAll = totalCombinedSouls > 0 ? Math.round((pcf.soulsWon / totalCombinedSouls) * 100) : 0;

              return (
                <div
                  key={pcf.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    border: `1.5px solid ${isFirst ? '#d97706' : '#e2e8f0'}`,
                    boxShadow: isFirst ? '0 4px 16px rgba(217, 119, 6, 0.14)' : '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{medal}</span>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>
                          {pcf.emoji} {pcf.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: '800',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: isService1 ? 'rgba(0, 135, 81, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                              color: isService1 ? '#008751' : '#d97706',
                              border: `1px solid ${isService1 ? 'rgba(0, 135, 81, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                              fontFamily: "'Orbitron', sans-serif",
                            }}
                          >
                            {isService1 ? 'SERVICE 1' : 'SERVICE 2'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>
                            {isService1 ? 'Zonal Church 1' : 'Zonal Church 2'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif" }}>
                        {pcf.soulsWon.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>
                        {shareOfAll}% of Total
                      </div>
                    </div>
                  </div>

                  {/* PROPORTIONAL PROGRESS TRACK */}
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: pcf.color,
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 8px ${pcf.glowColor}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {(service1Unassigned > 0 || service2Unassigned > 0) && (
            <div style={{ marginTop: '10px', fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic', textAlign: 'right' }}>
              * {(service1Unassigned + service2Unassigned).toLocaleString()} additional souls contributed without a specific PCF tag across services
            </div>
          )}
        </div>
      )}

      {/* 2. SERVICE 1 ONLY TAB (SEPARATED) */}
      {activeTab === 'service-1' && (
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '2px solid rgba(0, 135, 81, 0.2)',
              paddingBottom: '8px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: '900',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <Sparkles size={20} style={{ color: '#008751' }} />
              SERVICE 1 PCF STANDINGS
              <span
                style={{
                  background: 'rgba(0, 135, 81, 0.1)',
                  color: '#008751',
                  borderRadius: '20px',
                  padding: '2px 10px',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {service1PCFs.length} PCFs · {service1Souls.toLocaleString()} SOULS TOTAL
              </span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {service1PCFs.map((pcf, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              const medal = idx < 3 ? medals[idx] : `#${idx + 1}`;
              const barWidth = Math.max(4, Math.round((pcf.soulsWon / maxPCF1Souls) * 100));
              const isFirst = idx === 0 && pcf.soulsWon > 0;

              return (
                <div
                  key={pcf.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    border: `1.5px solid ${isFirst ? '#d97706' : '#e2e8f0'}`,
                    boxShadow: isFirst ? '0 4px 16px rgba(217, 119, 6, 0.14)' : '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{medal}</span>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>
                          {pcf.emoji} {pcf.name}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: '700' }}>
                          ZONAL CHURCH 1
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif" }}>
                        {pcf.soulsWon.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>
                        {pcf.percentageOfService}% of Service 1
                      </div>
                    </div>
                  </div>

                  {/* PROPORTIONAL PROGRESS TRACK */}
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: pcf.color,
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 8px ${pcf.glowColor}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {service1Unassigned > 0 && (
            <div style={{ marginTop: '10px', fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic', textAlign: 'right' }}>
              * {service1Unassigned.toLocaleString()} additional souls contributed without a specific PCF tag
            </div>
          )}
        </div>
      )}

      {/* 3. SERVICE 2 ONLY TAB (SEPARATED) */}
      {activeTab === 'service-2' && (
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '2px solid rgba(217, 119, 6, 0.2)',
              paddingBottom: '8px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: '900',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <Trophy size={20} style={{ color: '#d97706' }} />
              SERVICE 2 PCF STANDINGS
              <span
                style={{
                  background: 'rgba(217, 119, 6, 0.1)',
                  color: '#d97706',
                  borderRadius: '20px',
                  padding: '2px 10px',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                {service2PCFs.length} PCFs · {service2Souls.toLocaleString()} SOULS TOTAL
              </span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {service2PCFs.map((pcf, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              const medal = idx < 3 ? medals[idx] : `#${idx + 1}`;
              const barWidth = Math.max(4, Math.round((pcf.soulsWon / maxPCF2Souls) * 100));
              const isFirst = idx === 0 && pcf.soulsWon > 0;

              return (
                <div
                  key={pcf.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    border: `1.5px solid ${isFirst ? '#d97706' : '#e2e8f0'}`,
                    boxShadow: isFirst ? '0 4px 16px rgba(217, 119, 6, 0.14)' : '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{medal}</span>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0f172a' }}>
                          {pcf.emoji} {pcf.name}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: '700' }}>
                          ZONAL CHURCH 2
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif" }}>
                        {pcf.soulsWon.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>
                        {pcf.percentageOfService}% of Service 2
                      </div>
                    </div>
                  </div>

                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: pcf.color,
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 8px ${pcf.glowColor}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {service2Unassigned > 0 && (
            <div style={{ marginTop: '10px', fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic', textAlign: 'right' }}>
              * {service2Unassigned.toLocaleString()} additional souls contributed without a specific PCF tag
            </div>
          )}
        </div>
      )}

      {/* COMBINED ARENA LEADERBOARD TABLE */}
      {activeTab === 'all' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} style={{ color: '#d97706' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif" }}>
                OVERALL ZONAL PCF LEADERBOARD ({combinedPCFs.length} PCFs)
              </h3>
            </div>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '700' }}>
              Ranking all active PCFs across both Service 1 and Service 2
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '800', color: '#475569' }}>RANK</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', color: '#475569' }}>PCF NAME</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', color: '#475569' }}>SERVICE JURISDICTION</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>SOULS WON</th>
                  <th style={{ padding: '10px 14px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>SERVICE SHARE</th>
                </tr>
              </thead>
              <tbody>
                {combinedPCFs.map((pcf, idx) => {
                  const isTop = idx === 0 && pcf.soulsWon > 0;
                  const rankDisplay = idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`;

                  return (
                    <tr
                      key={pcf.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isTop ? 'rgba(217, 119, 6, 0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: isTop ? '#d97706' : '#64748b', fontFamily: "'Orbitron', sans-serif" }}>
                        {rankDisplay}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                        {pcf.emoji} {pcf.name}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: pcf.service === 'service-1' ? 'rgba(0, 135, 81, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: pcf.service === 'service-1' ? '#008751' : '#d97706',
                            border: `1px solid ${pcf.service === 'service-1' ? 'rgba(0, 135, 81, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            fontFamily: "'Orbitron', sans-serif",
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Shield size={11} />
                          {pcf.serviceLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '900', color: '#0f172a', fontFamily: "'Orbitron', sans-serif" }}>
                        {pcf.soulsWon.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', color: '#64748b', fontFamily: "'Share Tech Mono', monospace" }}>
                        {pcf.percentageOfService}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOOTER AUDIT TIMESTAMP */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '16px' }}>
        Last updated: {lastRefreshed.toLocaleTimeString()} · Real-time auto sync across all devices
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
