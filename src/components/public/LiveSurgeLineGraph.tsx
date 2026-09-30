import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Zap,
  Flame,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import {
  aggregateRecordsIntoTimeline,
  generateCampaignDaySimulation,
  type TimelineBucket,
  type TimelineSummary,
} from '../../services/surgeTimelineService';
import type { SoulWinningRecord } from '../../types/record';

interface LiveSurgeLineGraphProps {
  records?: SoulWinningRecord[];
  isFullScreenMode?: boolean;
  onCloseFullScreen?: () => void;
  title?: string;
  subtitle?: string;
  defaultMode?: 'velocity' | 'cumulative';
  singleCardMode?: boolean;
}

export const LiveSurgeLineGraph: React.FC<LiveSurgeLineGraphProps> = ({
  records = [],
  isFullScreenMode = false,
  onCloseFullScreen,
  title = 'CAMPAIGN SOUL SURGE & INFLOW TIMELINE',
  subtitle = 'Real-time velocity tracking showing field outreach spikes, locations, and lead groups',
  defaultMode = 'velocity',
  singleCardMode = false,
}) => {
  const [viewMode, setViewMode] = useState<'velocity' | 'cumulative'>(defaultMode);
  const [useSimulationData, setUseSimulationData] = useState<boolean>(false);
  const [selectedBucket, setSelectedBucket] = useState<TimelineBucket | null>(null);
  const [hoveredBucket, setHoveredBucket] = useState<TimelineBucket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [granularity, setGranularity] = useState<number>(60); // 60 mins
  const [drawerSearch, setDrawerSearch] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback to simulation if zero real records exist, but allow user to toggle freely
  const activeRecords = useMemo(() => {
    if (useSimulationData || (!records || records.length === 0)) {
      return generateCampaignDaySimulation();
    }
    return records;
  }, [records, useSimulationData]);

  // Aggregate timeline
  const timeline: TimelineSummary = useMemo(() => {
    return aggregateRecordsIntoTimeline(activeRecords, granularity);
  }, [activeRecords, granularity]);

  const buckets = timeline.buckets;
  const activePoint = hoveredBucket || selectedBucket;

  // SVG Chart Geometry calculations
  const chartWidth = 1000;
  const chartHeight = 380;
  const paddingLeft = 70;
  const paddingRight = 40;
  const paddingTop = 50;
  const paddingBottom = 60;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Max value calculation based on mode
  const maxValue = useMemo(() => {
    if (buckets.length === 0) return 100;
    if (viewMode === 'cumulative') {
      const maxCum = Math.max(...buckets.map((b) => b.cumulativeSouls), 10);
      return Math.ceil(maxCum * 1.15);
    }
    const maxSpike = Math.max(...buckets.map((b) => b.soulsCount), 10);
    return Math.ceil(maxSpike * 1.25);
  }, [buckets, viewMode]);

  // Map each bucket to SVG coordinates (x, y)
  const plotPoints = useMemo(() => {
    if (buckets.length === 0) return [];
    const stepX = innerWidth / Math.max(buckets.length - 1, 1);

    return buckets.map((b, idx) => {
      const val = viewMode === 'cumulative' ? b.cumulativeSouls : b.soulsCount;
      const x = paddingLeft + idx * stepX;
      const y = paddingTop + innerHeight - (val / Math.max(maxValue, 1)) * innerHeight;
      return {
        bucket: b,
        x,
        y: Math.max(paddingTop, Math.min(paddingTop + innerHeight, y)),
        value: val,
      };
    });
  }, [buckets, innerWidth, innerHeight, paddingLeft, paddingTop, maxValue, viewMode]);

  // Smooth Catmull-Rom or cubic spline path generator
  const { pathData, areaPathData } = useMemo(() => {
    if (plotPoints.length === 0) return { pathData: '', areaPathData: '' };
    if (plotPoints.length === 1) {
      const p = plotPoints[0];
      return {
        pathData: `M ${p.x} ${p.y}`,
        areaPathData: `M ${p.x} ${paddingTop + innerHeight} L ${p.x} ${p.y} L ${p.x} ${paddingTop + innerHeight} Z`,
      };
    }

    let d = `M ${plotPoints[0].x} ${plotPoints[0].y}`;
    for (let i = 0; i < plotPoints.length - 1; i++) {
      const current = plotPoints[i];
      const next = plotPoints[i + 1];
      const controlX1 = current.x + (next.x - current.x) * 0.45;
      const controlY1 = current.y;
      const controlX2 = next.x - (next.x - current.x) * 0.45;
      const controlY2 = next.y;
      d += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }

    const baselineY = paddingTop + innerHeight;
    const lastX = plotPoints[plotPoints.length - 1].x;
    const firstX = plotPoints[0].x;
    const areaD = `${d} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { pathData: d, areaPathData: areaD };
  }, [plotPoints, paddingTop, innerHeight]);

  // Horizontal Grid Lines
  const gridLines = useMemo(() => {
    const ticks = 4;
    return Array.from({ length: ticks + 1 }).map((_, i) => {
      const frac = i / ticks;
      const val = Math.round(maxValue * (1 - frac));
      const y = paddingTop + frac * innerHeight;
      return { y, val };
    });
  }, [maxValue, paddingTop, innerHeight]);

  // Auto-select peak spike on initial load if none selected
  useEffect(() => {
    if (!selectedBucket && timeline.peakBucket) {
      setSelectedBucket(timeline.peakBucket);
    }
  }, [timeline.peakBucket, selectedBucket]);

  // Filter drawer records
  const filteredDrawerRecords = useMemo(() => {
    if (!selectedBucket) return [];
    const query = drawerSearch.toLowerCase().trim();
    if (!query) return selectedBucket.records;
    return selectedBucket.records.filter(
      (r) =>
        r.name?.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query) ||
        r.churchName?.toLowerCase().includes(query) ||
        r.groupName?.toLowerCase().includes(query)
    );
  }, [selectedBucket, drawerSearch]);

  return (
    <div
      ref={containerRef}
      className={`live-surge-graph-container ${isFullScreenMode ? 'fullscreen-surge-view' : ''} ${singleCardMode ? 'single-card-mode' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        maxHeight: isFullScreenMode ? '100vh' : (singleCardMode ? 'calc(100vh - 130px)' : 'none'),
        minHeight: singleCardMode ? 'auto' : (isFullScreenMode ? '100vh' : '520px'),
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #090e17 0%, #0d1523 50%, #070b12 100%)',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, sans-serif",
        position: 'relative',
        overflow: singleCardMode ? 'hidden' : 'auto',
        borderRadius: isFullScreenMode ? '0' : '20px',
        border: isFullScreenMode ? 'none' : '1.5px solid rgba(0, 135, 81, 0.25)',
        boxShadow: isFullScreenMode ? 'none' : '0 20px 50px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* GLOWING AMBIENT BACKGROUND ACCENTS */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          right: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 255, 135, 0.08) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-150px',
          left: '5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 210, 255, 0.06) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* HEADER SECTION WITH METRICS AND CONTROL TOOLBAR */}
      {singleCardMode ? (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 15, 29, 0.85)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* TITLE & LIVE BADGE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0, 255, 135, 0.15)',
                border: '1px solid rgba(0, 255, 135, 0.3)',
                padding: '3px 8px',
                borderRadius: '12px',
                color: '#00ff87',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#00ff87',
                  boxShadow: '0 0 8px #00ff87',
                  display: 'inline-block',
                  animation: 'pulse 1.8s infinite',
                }}
              />
              <span>LIVE</span>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Activity size={18} style={{ color: '#00ff87' }} />
              <span>{title}</span>
            </h2>
          </div>

          {/* INLINE COMPACT KPI PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 255, 135, 0.25)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}
            >
              <Zap size={14} style={{ color: '#00ff87' }} />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>PACE:</span>
              <strong style={{ fontSize: '0.86rem', color: '#00ff87', fontFamily: "'Orbitron', sans-serif" }}>
                {timeline.currentVelocityPerHour} <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>/HR</span>
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}
            >
              <Flame size={14} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>PEAK:</span>
              <strong style={{ fontSize: '0.86rem', color: '#fbbf24', fontFamily: "'Orbitron', sans-serif" }}>
                +{timeline.peakBucket ? timeline.peakBucket.soulsCount.toLocaleString() : 0}
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}
            >
              <TrendingUp size={14} style={{ color: '#00d2ff' }} />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL:</span>
              <strong style={{ fontSize: '0.86rem', color: '#ffffff', fontFamily: "'Orbitron', sans-serif" }}>
                {timeline.totalSouls.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* VIEW TOGGLES & ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setUseSimulationData(!useSimulationData)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: useSimulationData ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                border: useSimulationData ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                color: useSimulationData ? '#fbbf24' : '#cbd5e1',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Toggle demo simulation"
            >
              <Sparkles size={13} />
              <span>{useSimulationData ? 'DEMO' : 'LIVE'}</span>
            </button>

            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setGranularity(60)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: granularity === 60 ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                  color: granularity === 60 ? '#00ff87' : '#94a3b8',
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                1H
              </button>
              <button
                type="button"
                onClick={() => setGranularity(30)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: granularity === 30 ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                  color: granularity === 30 ? '#00ff87' : '#94a3b8',
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                30M
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('velocity')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: viewMode === 'velocity' ? 'linear-gradient(135deg, #008751, #00b36b)' : 'transparent',
                  color: viewMode === 'velocity' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                SPIKES
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cumulative')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: viewMode === 'cumulative' ? 'linear-gradient(135deg, #008751, #00b36b)' : 'transparent',
                  color: viewMode === 'cumulative' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                GROWTH
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '20px 28px 16px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 15, 29, 0.75)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(0, 255, 135, 0.15)',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    color: '#00ff87',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#00ff87',
                      boxShadow: '0 0 10px #00ff87',
                      display: 'inline-block',
                      animation: 'pulse 1.8s infinite',
                    }}
                  />
                  <span>LIVE STREAM ACTIVE</span>
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: isFullScreenMode ? '1.5rem' : '1.25rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Activity size={24} style={{ color: '#00ff87' }} />
                  <span>{title}</span>
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>
                {subtitle}
              </p>
            </div>

            {/* VIEW TOGGLES & ACTIONS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* SIMULATION / LIVE TOGGLE */}
              <button
                type="button"
                onClick={() => setUseSimulationData(!useSimulationData)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: useSimulationData ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  border: useSimulationData ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: useSimulationData ? '#fbbf24' : '#cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Toggle between live recorded entries and full campaign surge simulation"
              >
                <Sparkles size={14} />
                <span>{useSimulationData ? 'DEMO SIMULATION ACTIVE' : 'LIVE FIRESTORE ENTRIES'}</span>
              </button>

              {/* INTERVAL GRANULARITY SELECTOR */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '3px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setGranularity(60)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '7px',
                    background: granularity === 60 ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                    color: granularity === 60 ? '#00ff87' : '#94a3b8',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  1 HR
                </button>
                <button
                  type="button"
                  onClick={() => setGranularity(30)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '7px',
                    background: granularity === 30 ? 'rgba(0, 255, 135, 0.2)' : 'transparent',
                    color: granularity === 30 ? '#00ff87' : '#94a3b8',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  30 MIN
                </button>
              </div>

              {/* VELOCITY VS CUMULATIVE MODE SWITCH */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '3px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('velocity')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    background: viewMode === 'velocity' ? 'linear-gradient(135deg, #008751, #00b36b)' : 'transparent',
                    color: viewMode === 'velocity' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Zap size={14} />
                  <span>SURGE SPIKES</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cumulative')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    background: viewMode === 'cumulative' ? 'linear-gradient(135deg, #008751, #00b36b)' : 'transparent',
                    color: viewMode === 'cumulative' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <TrendingUp size={14} />
                  <span>CUMULATIVE GROWTH</span>
                </button>
              </div>

              {/* CLOSE FULL SCREEN IF APPLICABLE */}
              {isFullScreenMode && onCloseFullScreen && (
                <button
                  type="button"
                  onClick={onCloseFullScreen}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                  <span>EXIT FULL SCREEN</span>
                </button>
              )}
            </div>
          </div>

          {/* HIGH-LEVEL KPI CHIPS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                borderRadius: '12px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(0, 255, 135, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00ff87',
                }}
              >
                <Zap size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  CURRENT INFLOW PACE
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00ff87', fontFamily: "'Orbitron', sans-serif" }}>
                  {timeline.currentVelocityPerHour} <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>SOULS/HR</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <Flame size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  PEAK SPIKE INTENSITY
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', fontFamily: "'Orbitron', sans-serif" }}>
                  +{timeline.peakBucket ? timeline.peakBucket.soulsCount.toLocaleString() : 0}{' '}
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>SOULS IN 1 HR</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(0, 210, 255, 0.2)',
                borderRadius: '12px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(0, 210, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00d2ff',
                }}
              >
                <TrendingUp size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  TOTAL LOGGED ON TIMELINE
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', fontFamily: "'Orbitron', sans-serif" }}>
                  {timeline.totalSouls.toLocaleString()}{' '}
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SOULS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN GRAPH AREA + REALTIME SPIKE ANNOTATIONS */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: singleCardMode ? '6px 20px' : '10px 24px',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* INTERACTIVE SVG LINE GRAPH */}
        <div style={{ width: '100%', height: singleCardMode ? '100%' : (isFullScreenMode ? '340px' : '280px'), minHeight: singleCardMode ? '160px' : '260px', position: 'relative' }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'visible',
            }}
            preserveAspectRatio="none"
          >
            <defs>
              {/* AREA GLOW GRADIENT */}
              <linearGradient id="surgeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff87" stopOpacity="0.32" />
                <stop offset="50%" stopColor="#008751" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#008751" stopOpacity="0.0" />
              </linearGradient>

              {/* STROKE NEON FILTER */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* GOLD PEAK FILTER */}
              <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* HORIZONTAL GRID LINES & Y-AXIS LABELS */}
            {gridLines.map((line, idx) => (
              <g key={`grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={line.y}
                  x2={chartWidth - paddingRight}
                  y2={line.y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 14}
                  y={line.y + 4}
                  fill="#64748b"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="end"
                  fontFamily="'Share Tech Mono', monospace"
                >
                  {viewMode === 'cumulative' ? line.val.toLocaleString() : `+${line.val}`}
                </text>
              </g>
            ))}

            {/* AVERAGE BASELINE REFERENCE */}
            {viewMode === 'velocity' && timeline.averageSoulsPerInterval > 0 && (
              <g>
                <line
                  x1={paddingLeft}
                  y1={paddingTop + innerHeight - (timeline.averageSoulsPerInterval / Math.max(maxValue, 1)) * innerHeight}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop + innerHeight - (timeline.averageSoulsPerInterval / Math.max(maxValue, 1)) * innerHeight}
                  stroke="rgba(0, 210, 255, 0.4)"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                <text
                  x={chartWidth - paddingRight}
                  y={paddingTop + innerHeight - (timeline.averageSoulsPerInterval / Math.max(maxValue, 1)) * innerHeight - 6}
                  fill="#00d2ff"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="end"
                  fontFamily="'Share Tech Mono', monospace"
                >
                  AVG PACE ({timeline.averageSoulsPerInterval}/HR)
                </text>
              </g>
            )}

            {/* AREA FILL UNDER LINE */}
            {areaPathData && (
              <path d={areaPathData} fill="url(#surgeAreaGradient)" />
            )}

            {/* MAIN GLOWING CURVE */}
            {pathData && (
              <path
                d={pathData}
                fill="none"
                stroke="#00ff87"
                strokeWidth="3.5"
                filter="url(#neonGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* VERTICAL GUIDELINE TO CURRENT SELECTED POINT */}
            {activePoint && (
              (() => {
                const pt = plotPoints.find((p) => p.bucket.id === activePoint.id);
                if (!pt) return null;
                return (
                  <line
                    x1={pt.x}
                    y1={paddingTop}
                    x2={pt.x}
                    y2={paddingTop + innerHeight}
                    stroke="rgba(0, 255, 135, 0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })()
            )}

            {/* INTERACTIVE DATA POINTS / NODES */}
            {plotPoints.map((pt) => {
              const isPeak = pt.bucket.spikeIntensity === 'peak';
              const isHigh = pt.bucket.spikeIntensity === 'high';
              const isSelected = activePoint?.id === pt.bucket.id;

              return (
                <g
                  key={`pt-${pt.bucket.id}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedBucket(pt.bucket);
                    setIsDrawerOpen(true);
                  }}
                  onMouseEnter={() => setHoveredBucket(pt.bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                >
                  {/* PULSE HALO FOR SPIKES */}
                  {(isPeak || isHigh) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isPeak ? 16 : 12}
                      fill={isPeak ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 255, 135, 0.22)'}
                      className="pulse-halo"
                    />
                  )}

                  {/* ACTIVE RING */}
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={14}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* MAIN NODE CIRCLE */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isPeak ? 8 : isHigh ? 6.5 : isSelected ? 7 : 4.5}
                    fill={isPeak ? '#ffd700' : isHigh ? '#00ff87' : '#ffffff'}
                    stroke="#090e17"
                    strokeWidth="2.5"
                    filter={isPeak ? 'url(#goldGlow)' : 'url(#neonGlow)'}
                  />

                  {/* INLINE SPIKE CALLOUT BADGES ABOVE PEAKS */}
                  {(isPeak || isHigh) && viewMode === 'velocity' && (
                    <g transform={`translate(${pt.x}, ${pt.y - 18})`}>
                      <rect
                        x="-48"
                        y="-20"
                        width="96"
                        height="20"
                        rx="6"
                        fill={isPeak ? 'rgba(245, 158, 11, 0.95)' : 'rgba(0, 135, 81, 0.95)'}
                        stroke={isPeak ? '#ffd700' : '#00ff87'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="-6"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="900"
                        textAnchor="middle"
                        fontFamily="'Share Tech Mono', monospace"
                      >
                        {isPeak ? '👑 PEAK +' : '⚡ SURGE +'}{pt.bucket.soulsCount}
                      </text>
                    </g>
                  )}

                  {/* X-AXIS TIME LABEL */}
                  <text
                    x={pt.x}
                    y={paddingTop + innerHeight + 24}
                    fill={isSelected ? '#00ff87' : '#64748b'}
                    fontSize="10"
                    fontWeight={isSelected ? '900' : '600'}
                    textAnchor="middle"
                    fontFamily="'Share Tech Mono', monospace"
                  >
                    {pt.bucket.timeLabel.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ROOT CAUSE POPUP CARD ("ON THE POINTS ON THE GRAPH YOU CAN SEE WHAT CAUSED IT") */}
        {!singleCardMode && activePoint && (
          <div
            style={{
              position: 'relative',
              marginTop: '10px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(13, 38, 27, 0.92) 100%)',
              border: activePoint.isSpike
                ? '1.5px solid rgba(0, 255, 135, 0.45)'
                : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '16px 22px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* CARD HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: activePoint.spikeIntensity === 'peak'
                      ? 'rgba(245, 158, 11, 0.25)'
                      : activePoint.isSpike
                      ? 'rgba(0, 255, 135, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: activePoint.spikeIntensity === 'peak'
                      ? '#ffd700'
                      : activePoint.isSpike
                      ? '#00ff87'
                      : '#cbd5e1',
                    border: activePoint.isSpike ? '1px solid currentColor' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  <Clock size={13} />
                  <span>WINDOW: {activePoint.timeLabel}</span>
                </span>

                {activePoint.isSpike && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: activePoint.spikeIntensity === 'peak' ? '#ffd700' : '#00ff87',
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Flame size={14} />
                    <span>{activePoint.spikeIntensity === 'peak' ? 'HIGHEST SURGE PEAK OF CAMPAIGN' : 'SIGNIFICANT FIELD SURGE SPIKE'}</span>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '6px' }}>INTERVAL SOULS:</span>
                  <strong style={{ fontSize: '1.15rem', color: '#00ff87', fontFamily: "'Orbitron', sans-serif" }}>
                    +{activePoint.soulsCount.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '6px' }}>CUMULATIVE:</span>
                  <strong style={{ fontSize: '1.15rem', color: '#ffffff', fontFamily: "'Orbitron', sans-serif" }}>
                    {activePoint.cumulativeSouls.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* WHAT CAUSED THIS SPIKE? - DETAILED ROOT CAUSE BREAKDOWN */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '14px',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* PRIMARY CONTRIBUTOR (GROUP & CHURCH) */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  🎯 PRIMARY DRIVER / LEAD GROUP
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} style={{ color: '#00ff87' }} />
                  <span>{activePoint.spikeCause.primaryGroup}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
                  Contributed <strong>{activePoint.spikeCause.primaryGroupCount} souls</strong> ({activePoint.spikeCause.primaryGroupPercentage}% of this surge) via <em>{activePoint.spikeCause.primaryChurch}</em>
                </div>
              </div>

              {/* PRIMARY LOCATIONS */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  📍 TOP OUTREACH LOCATIONS IN THIS SPIKE
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activePoint.spikeCause.topLocations.map((loc, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.78rem',
                        background: 'rgba(0, 135, 81, 0.25)',
                        border: '1px solid rgba(0, 255, 135, 0.25)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MapPin size={12} style={{ color: '#00ff87' }} />
                      <span>{loc.location} ({loc.count})</span>
                    </span>
                  ))}
                  {activePoint.spikeCause.topLocations.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Various field locations</span>
                  )}
                </div>
              </div>

              {/* SPIRITUAL FRUITS & KEY SOUL WINNERS */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                  ✨ SPIRITUAL FRUITS & SOUL WINNERS
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  <span>{activePoint.spikeCause.bornAgainCount} Born Again</span> •{' '}
                  <span>{activePoint.spikeCause.holySpiritCount} Filled with Holy Spirit</span>
                </div>
                {activePoint.spikeCause.topSoulWinners.length > 0 && (
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                    Active: {activePoint.spikeCause.topSoulWinners.map((w) => w.name).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* ACTION TO DEEP-DIVE INTO ALL RECORDS OF THIS POINT */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                💡 {activePoint.spikeCause.headline}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedBucket(activePoint);
                  setIsDrawerOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 135, 81, 0.35)',
                  border: '1px solid rgba(0, 255, 135, 0.4)',
                  color: '#00ff87',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>VIEW ALL {activePoint.soulsCount} SOUL RECORDS FOR THIS SPIKE</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COMPACT DOCKED ROOT CAUSE INSPECTOR BAR FOR SINGLE CARD MODE */}
      {singleCardMode && (
        <div
          className="surge-driver-footer-banner"
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 38, 27, 0.95) 100%)',
            borderTop: '1px solid rgba(0, 255, 135, 0.25)',
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backdropFilter: 'blur(14px)',
            minHeight: '58px',
          }}
        >
          {activePoint ? (
            <div className="surge-driver-info-block" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              {/* TIME & SPIKE PILL */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: activePoint.spikeIntensity === 'peak'
                    ? 'rgba(245, 158, 11, 0.25)'
                    : activePoint.isSpike
                    ? 'rgba(0, 255, 135, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: activePoint.spikeIntensity === 'peak'
                    ? '#ffd700'
                    : activePoint.isSpike
                    ? '#00ff87'
                    : '#cbd5e1',
                  border: activePoint.isSpike ? '1px solid currentColor' : 'none',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  fontFamily: "'Share Tech Mono', monospace",
                }}
              >
                <Clock size={12} />
                <span>{activePoint.timeLabel}</span>
                {activePoint.isSpike && (
                  <span>• {activePoint.spikeIntensity === 'peak' ? '👑 PEAK' : '⚡ SURGE'} +{activePoint.soulsCount}</span>
                )}
              </div>

              {/* PRIMARY DRIVER */}
              <div className="surge-driver-item" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                <Building2 size={14} style={{ color: '#00ff87', flexShrink: 0 }} />
                <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800 }}>DRIVER:</span>
                <strong style={{ color: '#ffffff' }}>{activePoint.spikeCause.primaryGroup}</strong>
                <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  ({activePoint.spikeCause.primaryChurch} • {activePoint.spikeCause.primaryGroupCount} souls, {activePoint.spikeCause.primaryGroupPercentage}%)
                </span>
              </div>

              {/* LOCATIONS */}
              {activePoint.spikeCause.topLocations.length > 0 && (
                <div className="surge-driver-item" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                  <MapPin size={13} style={{ color: '#00ff87', flexShrink: 0 }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800 }}>LOCATIONS:</span>
                  <span style={{ color: '#cbd5e1' }}>
                    {activePoint.spikeCause.topLocations.slice(0, 2).map((l) => `${l.location} (${l.count})`).join(', ')}
                  </span>
                </div>
              )}

              {/* SOUL WINNERS */}
              {activePoint.spikeCause.topSoulWinners.length > 0 && (
                <div className="surge-driver-item" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                  <Sparkles size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800 }}>LEADERS:</span>
                  <span style={{ color: '#cbd5e1' }}>
                    {activePoint.spikeCause.topSoulWinners.slice(0, 2).map((w) => w.name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
              <Activity size={15} style={{ color: '#00ff87' }} />
              <span>Hover or click any node point on the graph to inspect what caused that soul surge</span>
            </div>
          )}

          {activePoint && (
            <button
              type="button"
              className="surge-driver-action-btn"
              onClick={() => {
                setSelectedBucket(activePoint);
                setIsDrawerOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(0, 135, 81, 0.3)',
                border: '1px solid rgba(0, 255, 135, 0.4)',
                color: '#00ff87',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <span>VIEW ALL {activePoint.soulsCount} ENTRIES</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* DETAILED SURGE LOG INSPECTION DRAWER / MODAL */}
      {isDrawerOpen && selectedBucket && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(9, 14, 23, 0.98)',
            borderLeft: '1.5px solid rgba(0, 135, 81, 0.35)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.25s ease',
          }}
        >
          {/* DRAWER HEADER */}
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#00ff87', fontWeight: 800, letterSpacing: '0.05em' }}>
                SURGE DEEP-DIVE INSPECTOR
              </div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                {selectedBucket.timeLabel} • +{selectedBucket.soulsCount} Souls
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* SEARCH FILTER */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <input
              type="text"
              placeholder="Search souls, church, location in this spike..."
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* RECORDS LIST */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredDrawerRecords.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                No soul records match this search.
              </div>
            ) : (
              filteredDrawerRecords.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{r.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#00ff87', fontWeight: 700 }}>
                      {r.isBornAgain ? '✓ Born Again' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} style={{ color: '#00d2ff' }} />
                    <span>{r.location || 'Outreach Point'}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {r.groupName} • {r.churchName}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
