import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Flame,
  Award,
  ChevronRight,
  X,
  Radio,
  Building,
  Target,
  Compass,
  Zap,
} from 'lucide-react';
import {
  ABUJA_CHURCH_LOCATIONS,
  type ChurchMapLocation,
} from '../../services/abujaLocationsData';
import { subscribeToZonalCounter, type ZonalCounterData } from '../../services/counterService';
import { calculateChurchRaceProgress } from '../../services/targetProgressEngine';
import { getChurches } from '../../services/organizationService';
import { getTargets } from '../../services/targetService';
import type { OrganizationProgress } from '../../types/target';

interface ActiveAddition {
  churchId: string;
  churchName: string;
  delta: number;
  timestamp: number;
}

interface AbujaHarvestMapViewProps {
  onOpenAuth?: () => void;
}

export const AbujaHarvestMapView: React.FC<AbujaHarvestMapViewProps> = ({ onOpenAuth: _onOpenAuth }) => {
  // Map pan and zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected church and search query (Everything on 1 map — no tabs)
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hoveredChurchId, setHoveredChurchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live real-time additions state
  const [activeAdditions, setActiveAdditions] = useState<Record<string, ActiveAddition>>({});
  const [recentFeed, setRecentFeed] = useState<ActiveAddition[]>([]);

  // Church progresses
  const [churchProgressMap, setChurchProgressMap] = useState<Map<string, OrganizationProgress>>(new Map());
  const [totalZonalSouls, setTotalZonalSouls] = useState<number>(0);
  const [zonalTarget, setZonalTarget] = useState<number>(50000);

  const prevCountsRef = useRef<Map<string, number>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time counter updates
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToZonalCounter(50000, async (data: ZonalCounterData) => {
      if (!isMounted) return;

      setTotalZonalSouls(data.totalSoulsWon);
      setZonalTarget(data.zonalTarget || 50000);

      try {
        const [churchesList, targetsList] = await Promise.all([getChurches(), getTargets()]);
        const records = data.allRecords || [];
        const progresses = calculateChurchRaceProgress(records, churchesList, targetsList);

        const newMap = new Map<string, OrganizationProgress>();
        const now = Date.now();

        progresses.forEach((p) => {
          newMap.set(p.organizationId, p);

          // Check if there was an addition compared to previous count
          const prevCount = prevCountsRef.current.get(p.organizationId);
          if (prevCount !== undefined && p.actual > prevCount) {
            const delta = p.actual - prevCount;
            const churchLoc = ABUJA_CHURCH_LOCATIONS.find((c) => c.id === p.organizationId);
            const churchName = churchLoc?.name || p.organizationName;

            // Trigger real-time light-up
            setActiveAdditions((prev) => ({
              ...prev,
              [p.organizationId]: {
                churchId: p.organizationId,
                churchName,
                delta,
                timestamp: now,
              },
            }));

            setRecentFeed((prev) => [
              {
                churchId: p.organizationId,
                churchName,
                delta,
                timestamp: now,
              },
              ...prev.slice(0, 9),
            ]);
          }

          // Update tracking ref
          prevCountsRef.current.set(p.organizationId, p.actual);
        });

        setChurchProgressMap(newMap);
      } catch (err) {
        console.warn('Error processing church progress for map:', err);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Cleanup old active addition glows after 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveAdditions((prev) => {
        let changed = false;
        const next: Record<string, ActiveAddition> = {};
        Object.entries(prev).forEach(([id, item]) => {
          if (now - item.timestamp < 30000) {
            next[id] = item;
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // All 127 churches always on the 1 unified map
  const matchingChurches = useMemo(() => {
    if (!searchQuery.trim()) return ABUJA_CHURCH_LOCATIONS;
    const q = searchQuery.toLowerCase();
    return ABUJA_CHURCH_LOCATIONS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.groupName.toLowerCase().includes(q) ||
        c.districtName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Selected church data
  const activeChurch = useMemo(() => {
    const targetId = selectedChurchId || hoveredChurchId;
    if (!targetId) return null;
    const location = ABUJA_CHURCH_LOCATIONS.find((c) => c.id === targetId);
    if (!location) return null;
    const progress = churchProgressMap.get(targetId);
    return {
      ...location,
      soulsWon: progress?.actual || 0,
      target: progress?.target || 100,
      percentage: progress?.percentage || 0,
      isTargetExceeded: progress?.isTargetExceeded || false,
      displayPercentage: progress?.displayPercentage || '0.0%',
    };
  }, [selectedChurchId, hoveredChurchId, churchProgressMap]);

  // Pan to specific coordinates on the 1 map
  const focusOnCoordinates = (targetX: number, targetY: number, newZoom: number = 2) => {
    const newPanX = (600 - targetX) * newZoom;
    const newPanY = (450 - targetY) * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleChurchClick = (church: ChurchMapLocation) => {
    setSelectedChurchId(church.id);
    focusOnCoordinates(church.x, church.y, Math.max(zoom, 1.8));
  };

  // Zoom helpers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.35, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.35, 0.7));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedChurchId(null);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Demo simulation trigger to test real-time light-up addition
  const handleSimulateRealtimeAddition = (targetChurchId?: string) => {
    const candidate = targetChurchId
      ? ABUJA_CHURCH_LOCATIONS.find((c) => c.id === targetChurchId)
      : ABUJA_CHURCH_LOCATIONS[Math.floor(Math.random() * ABUJA_CHURCH_LOCATIONS.length)];

    if (!candidate) return;

    const now = Date.now();
    setActiveAdditions((prev) => ({
      ...prev,
      [candidate.id]: {
        churchId: candidate.id,
        churchName: candidate.name,
        delta: 1,
        timestamp: now,
      },
    }));

    setRecentFeed((prev) => [
      {
        churchId: candidate.id,
        churchName: candidate.name,
        delta: 1,
        timestamp: now,
      },
      ...prev.slice(0, 9),
    ]);

    setChurchProgressMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(candidate.id);
      if (existing) {
        next.set(candidate.id, {
          ...existing,
          actual: existing.actual + 1,
          percentage: Math.min(100, Math.round(((existing.actual + 1) / existing.target) * 100)),
        });
      }
      return next;
    });

    setTotalZonalSouls((prev) => prev + 1);

    if (zoom < 1.3) {
      focusOnCoordinates(candidate.x, candidate.y, 1.6);
    }
  };

  const percentZonalAchieved =
    zonalTarget > 0 ? ((totalZonalSouls / zonalTarget) * 100).toFixed(1) : '0.0';

  return (
    <div className="abuja-map-page-wrapper light-mode-map" ref={containerRef}>
      {/* Light Mode Unified Header Strip (All on 1 Screen) */}
      <header className="abuja-map-header">
        <div className="abuja-map-title-row">
          <div className="abuja-map-brand">
            <div className="abuja-map-radar-badge">
              <span className="live-radar-ping" />
              <Radio size={14} className="radar-icon" />
              <span>LIVE HARVEST RADAR</span>
            </div>
            <h1 className="abuja-map-title">ABUJA GEOGRAPHIC CHURCH MAP</h1>
            <p className="abuja-map-subtitle">
              All 127 Churches Across Abuja Federal Capital Territory on One Unified Map
            </p>
          </div>

          {/* Unified Zonal Metrics HUD */}
          <div className="abuja-map-stats-pills">
            <div className="map-stat-pill primary-stat-pill">
              <Flame size={16} className="text-amber" />
              <div>
                <span className="map-stat-val">{totalZonalSouls.toLocaleString()}</span>
                <span className="map-stat-lbl">Zonal Souls Won</span>
              </div>
            </div>

            <div className="map-stat-pill">
              <Target size={15} className="text-blue" />
              <div>
                <span className="map-stat-val">{zonalTarget.toLocaleString()}</span>
                <span className="map-stat-lbl">Campaign Goal</span>
              </div>
            </div>

            <div className="map-stat-pill">
              <Award size={15} className="text-emerald" />
              <div>
                <span className="map-stat-val">{percentZonalAchieved}%</span>
                <span className="map-stat-lbl">Achieved</span>
              </div>
            </div>

            <div className="map-stat-pill">
              <Building size={15} className="text-slate" />
              <div>
                <span className="map-stat-val">127</span>
                <span className="map-stat-lbl">Churches on 1 Map</span>
              </div>
            </div>

            {/* Test Live Ping Simulator */}
            <button
              onClick={() => handleSimulateRealtimeAddition('ch-zonal-church-1')}
              className="map-simulate-addition-btn"
              title="Test real-time addition radar light-up on Zonal Church 1 (Jabi)"
            >
              <Zap size={14} />
              <span>TEST LIVE PING (JABI)</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Jump (No Tabs - 1 Unified Map) */}
        <div className="abuja-map-search-strip">
          <div className="map-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Quick search any church (e.g. Zonal Church 1, Dawaki, Utako, Kubwa)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="map-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                aria-label="Clear Search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Focus Button for Jabi Zonal Cathedral */}
          <button
            onClick={() => {
              focusOnCoordinates(670, 465, 2.4);
              setSelectedChurchId('ch-zonal-church-1');
            }}
            className="map-quick-focus-jabi-btn"
            title="Focus camera directly on Zonal Church Group (Jabi)"
          >
            <Award size={14} />
            <span>Focus Zonal Church Group (Jabi)</span>
          </button>
        </div>
      </header>

      {/* Main Map Interactive Stage (Light Mode Canvas) */}
      <div className="abuja-map-canvas-container">
        {/* Floating Zoom and Pan Controls */}
        <div className="map-floating-controls">
          <button onClick={handleZoomIn} className="map-ctrl-btn" title="Zoom In" aria-label="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button onClick={handleZoomOut} className="map-ctrl-btn" title="Zoom Out" aria-label="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button onClick={handleResetZoom} className="map-ctrl-btn" title="Reset View" aria-label="Reset View">
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              focusOnCoordinates(670, 465, 2.4);
              setSelectedChurchId('ch-zonal-church-1');
            }}
            className="map-ctrl-btn map-ctrl-jabi-btn"
            title="Focus Zonal Church Group (Jabi)"
            aria-label="Focus Jabi"
          >
            <Award size={18} />
          </button>
        </div>

        {/* Floating Compass Rose */}
        <div className="map-compass-rose" title="Abuja Federal Capital Territory Orientation">
          <Compass size={22} className="compass-icon" />
          <span className="compass-north">N</span>
        </div>

        {/* SVG Map Canvas — Light Mode */}
        <div
          className={`map-svg-viewport ${isDragging ? 'viewport-dragging' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1200 900"
            className="abuja-fct-svg light-svg"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '600px 450px',
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <defs>
              {/* Light Mode Gradients */}
              <radialGradient id="zonalHqLightGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
              </radialGradient>

              {/* Natural Water Gradient for Jabi Lake */}
              <radialGradient id="lakeWaterLightGradient" cx="45%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#0284c7" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
              </radialGradient>

              <filter id="lightDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#0f172a" floodOpacity="0.20" />
              </filter>

              <filter id="boldBorderShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.30" />
              </filter>

              <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="intenseLightPulseGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feGaussianBlur stdDeviation="12" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* SURROUNDING STATE BUFFER / OUTSIDE CANVAS (Provides high contrast for Abuja FCT) */}
            <rect width="1200" height="900" fill="#e2e8f0" />

            {/* Subtle Cross Grid for Cartographic Precision */}
            <g className="map-grid-layer" opacity="0.65">
              {Array.from({ length: 13 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 100}
                  y1="0"
                  x2={i * 100}
                  y2="900"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4,6"
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 100}
                  x2="1200"
                  y2={i * 100}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4,6"
                />
              ))}
            </g>

            {/* NEIGHBORING STATE REGION LABELS (OUTSIDE FCT PERIMETER) */}
            <g className="map-neighboring-states-layer">
              {/* North: Kaduna State */}
              <g transform="translate(520, 36)">
                <rect width="160" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" filter="url(#boldBorderShadow)" />
                <text x="80" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" letterSpacing="1">
                  ⬆️ KADUNA STATE
                </text>
              </g>

              {/* East: Nasarawa State */}
              <g transform="translate(1000, 240)">
                <rect width="170" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" filter="url(#boldBorderShadow)" />
                <text x="85" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" letterSpacing="1">
                  ➡️ NASARAWA STATE
                </text>
              </g>

              <g transform="translate(950, 580)">
                <rect width="175" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" filter="url(#boldBorderShadow)" />
                <text x="87" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" letterSpacing="1">
                  ↘️ NASARAWA (KARSHI)
                </text>
              </g>

              {/* South: Kogi State */}
              <g transform="translate(440, 855)">
                <rect width="150" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" filter="url(#boldBorderShadow)" />
                <text x="75" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" letterSpacing="1">
                  ⬇️ KOGI STATE
                </text>
              </g>

              {/* West: Niger State */}
              <g transform="translate(30, 530)">
                <rect width="150" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" filter="url(#boldBorderShadow)" />
                <text x="75" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" letterSpacing="1">
                  ⬅️ NIGER STATE
                </text>
              </g>

              {/* North-West: Niger State / Suleja Border */}
              <g transform="translate(120, 195)">
                <rect width="180" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" filter="url(#boldBorderShadow)" />
                <text x="90" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" letterSpacing="1">
                  ↖️ NIGER (SULEJA)
                </text>
              </g>
            </g>

            {/* FCT ABUJA OFFICIAL TERRITORY BOUNDARY (BOLD, CRISP, HIGH-CONTRAST BORDER) */}
            <g className="map-fct-boundary-layer" filter="url(#lightDropShadow)">
              {/* Solid High-Definition White Landmass of Abuja FCT */}
              <path
                d="M 280,180 Q 420,120 600,100 Q 820,70 950,110 Q 1060,170 1020,340 Q 990,480 940,620 Q 880,780 720,840 Q 520,860 360,820 Q 180,780 120,680 Q 80,560 140,420 Q 190,260 280,180 Z"
                fill="#ffffff"
              />

              {/* Prominent Outer Dark Border Line (Bold Definition) */}
              <path
                d="M 280,180 Q 420,120 600,100 Q 820,70 950,110 Q 1060,170 1020,340 Q 990,480 940,620 Q 880,780 720,840 Q 520,860 360,820 Q 180,780 120,680 Q 80,560 140,420 Q 190,260 280,180 Z"
                fill="none"
                stroke="#0f172a"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Inner Official Administrative Border Stripe */}
              <path
                d="M 280,180 Q 420,120 600,100 Q 820,70 950,110 Q 1060,170 1020,340 Q 990,480 940,620 Q 880,780 720,840 Q 520,860 360,820 Q 180,780 120,680 Q 80,560 140,420 Q 190,260 280,180 Z"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeDasharray="10,6"
              />

              {/* Inner Municipal Density Zone (AMAC Core) */}
              <path
                d="M 440,240 Q 580,210 740,220 Q 890,260 880,410 Q 860,570 780,680 Q 640,710 500,680 Q 380,620 400,470 Q 410,330 440,240 Z"
                fill="#f8fafc"
                stroke="#64748b"
                strokeWidth="1.8"
                strokeDasharray="6,4"
              />
            </g>

            {/* Area Council Administrative Division Boundaries (Dashed Lines & Tags) */}
            <g className="map-area-councils-layer">
              {/* Bwari / AMAC boundary line */}
              <path d="M 520,200 Q 680,240 850,220 Q 960,200 1000,160" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
              <text x="800" y="215" className="area-council-tag">BWARI AREA COUNCIL</text>

              {/* AMAC (Abuja Municipal) tag */}
              <text x="830" y="380" className="area-council-tag">ABUJA MUNICIPAL (AMAC)</text>

              {/* Gwagwalada boundary line */}
              <path d="M 200,450 Q 340,480 430,550 Q 380,680 320,800" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
              <text x="260" y="530" className="area-council-tag">GWAGWALADA AREA COUNCIL</text>

              {/* Kuje boundary line */}
              <path d="M 430,550 Q 520,680 500,860" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
              <text x="470" y="780" className="area-council-tag">KUJE AREA COUNCIL</text>
            </g>

            {/* TOPOGRAPHICAL LANDMARKS (Aso Rock & Zuma Rock) */}
            <g className="map-topography-layer">
              {/* Aso Rock (Behind Three Arms Zone / CBD) */}
              <path
                d="M 870,440 L 890,410 L 910,415 L 930,440 Z"
                fill="#475569"
                stroke="#0f172a"
                strokeWidth="1.8"
              />
              <text x="900" y="402" className="mountain-label">⛰️ ASO ROCK (400m)</text>

              {/* Zuma Rock (Border landmark near Zuba) */}
              <path
                d="M 310,245 L 330,215 L 350,220 L 365,245 Z"
                fill="#475569"
                stroke="#0f172a"
                strokeWidth="1.8"
              />
              <text x="338" y="208" className="mountain-label">⛰️ ZUMA ROCK (725m)</text>
            </g>

            {/* Major Arteries / Expressways (Crisp High-Contrast Road Cartography) */}
            <g className="map-highways-layer">
              {/* Outer Northern Expressway / Kubwa Expressway */}
              <path
                d="M 330,280 Q 420,270 515,260 Q 580,310 600,370 Q 640,430 730,460 Q 790,485 850,505"
                fill="none"
                stroke="#0f172a"
                strokeWidth="6.5"
                strokeLinecap="round"
              />
              <path
                d="M 330,280 Q 420,270 515,260 Q 580,310 600,370 Q 640,430 730,460 Q 790,485 850,505"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 330,280 Q 420,270 515,260 Q 580,310 600,370 Q 640,430 730,460 Q 790,485 850,505"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6,6"
              />

              {/* Airport Road / Umaru Musa Yar'Adua Way (Vibrant Amber Highway) */}
              <path
                d="M 460,700 Q 530,640 560,610 Q 610,570 650,530 Q 700,500 785,485"
                fill="none"
                stroke="#78350f"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 460,700 Q 530,640 560,610 Q 610,570 650,530 Q 700,500 785,485"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3.8"
                strokeLinecap="round"
              />
              <path
                d="M 460,700 Q 530,640 560,610 Q 610,570 650,530 Q 700,500 785,485"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="8,6"
              />

              {/* Nnamdi Azikiwe Ring Road */}
              <path
                d="M 600,370 Q 650,410 660,450 Q 710,520 780,550 Q 820,530 830,470 Q 800,420 740,390 Z"
                fill="none"
                stroke="#1e293b"
                strokeWidth="5"
              />
              <path
                d="M 600,370 Q 650,410 660,450 Q 710,520 780,550 Q 820,530 830,470 Q 800,420 740,390 Z"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
                strokeDasharray="6,4"
              />

              {/* Obafemi Awolowo Way (Linking Jabi directly to Central Area) */}
              <path
                d="M 640,465 L 720,455 L 785,485"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="3.5"
              />
              <path
                d="M 640,465 L 720,455 L 785,485"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="5,4"
              />
            </g>

            {/* JABI LAKE: Natural Clean Blue Water (Not Green) */}
            <g className="map-jabi-lake-layer" filter="url(#pinGlow)">
              <path
                d="M 648,460 C 655,445 675,448 688,455 C 702,462 708,476 695,488 C 682,500 660,498 646,485 C 636,475 640,466 648,460 Z"
                fill="url(#lakeWaterLightGradient)"
                stroke="#0369a1"
                strokeWidth="2.5"
              />
              <text
                x="672"
                y="476"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="900"
                fill="#ffffff"
                letterSpacing="1"
              >
                🌊 JABI LAKE
              </text>
            </g>

            {/* ZONAL CHURCH GROUP HQ DISTRICT HIGHLIGHT (JABI) */}
            <g className="map-jabi-district-highlight">
              <rect
                x="632"
                y="434"
                width="84"
                height="72"
                rx="14"
                fill="rgba(254, 243, 199, 0.85)"
                stroke="#d97706"
                strokeWidth="2.2"
                strokeDasharray="5,4"
              />
              <text
                x="674"
                y="444"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="900"
                fill="#92400e"
                letterSpacing="0.8"
              >
                🏛️ ZONAL CHURCH GROUP HQ (JABI)
              </text>
            </g>

            {/* District Landmarks Labels (Bold High-Contrast Text with Crisp White Outline) */}
            <g className="map-district-labels-layer">
              <text x="590" y="358" className="district-label-light">GWARINPA ESTATE</text>
              <text x="520" y="248" className="district-label-light">KUBWA</text>
              <text x="720" y="438" className="district-label-light">UTAKO</text>
              <text x="730" y="525" className="district-label-light">WUYE</text>
              <text x="795" y="472" className="district-label-light">CENTRAL BUSINESS DIST.</text>
              <text x="800" y="562" className="district-label-light">GARKI</text>
              <text x="858" y="495" className="district-label-light">ASOKORO</text>
              <text x="725" y="638" className="district-label-light">LOKOGOMA</text>
              <text x="575" y="428" className="district-label-light">KARMO & DAPE</text>
              <text x="625" y="298" className="district-label-light">DAWAKI</text>
              <text x="830" y="128" className="district-label-light">BWARI</text>
              <text x="785" y="188" className="district-label-light">USHAFA</text>
              <text x="420" y="278" className="district-label-light">DEI-DEI</text>
              <text x="555" y="648" className="district-label-light">AIRPORT RD / LUGBE</text>
              <text x="430" y="758" className="district-label-light">KUJE</text>
              <text x="220" y="658" className="district-label-light">GWAGWALADA</text>
              <text x="340" y="278" className="district-label-light">ZUBA</text>
            </g>

            {/* ALL 127 CHURCH LOCATION POINTS (On 1 Map) */}
            <g className="map-church-pins-layer">
              {ABUJA_CHURCH_LOCATIONS.map((church) => {
                const progress = churchProgressMap.get(church.id);
                const soulsCount = progress?.actual || 0;
                const isSelected = selectedChurchId === church.id;
                const isHovered = hoveredChurchId === church.id;
                const activeAddition = activeAdditions[church.id];
                const hasRecentAddition = Boolean(activeAddition);

                // Zonal Church Group (Jabi) has royal gold highlight
                const isZonal = church.isZonalHQ;
                const pinRadius = isSelected || isHovered ? 8 : isZonal ? 6.5 : 5;

                const isMatch =
                  searchQuery.trim() === '' ||
                  matchingChurches.some((m) => m.id === church.id);

                return (
                  <g
                    key={church.id}
                    className={`church-pin-group ${hasRecentAddition ? 'pin-active-glow' : ''} ${
                      isSelected ? 'pin-selected' : ''
                    } ${isZonal ? 'pin-zonal-hq' : ''}`}
                    onClick={() => handleChurchClick(church)}
                    onMouseEnter={() => setHoveredChurchId(church.id)}
                    onMouseLeave={() => setHoveredChurchId(null)}
                    style={{
                      cursor: 'pointer',
                      opacity: isMatch ? 1 : 0.25,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <title>{`${church.name} (${soulsCount} souls won)`}</title>

                    {/* 1. Real-time Addition Radar Expansion Wave Rings (Light Mode) */}
                    {hasRecentAddition && (
                      <g className="radar-shockwave-rings">
                        <circle
                          cx={church.x}
                          cy={church.y}
                          r="12"
                          className="radar-expansion-ring-light-1"
                        />
                        <circle
                          cx={church.x}
                          cy={church.y}
                          r="22"
                          className="radar-expansion-ring-light-2"
                        />
                        <circle
                          cx={church.x}
                          cy={church.y}
                          r="34"
                          className="radar-expansion-ring-light-3"
                        />
                      </g>
                    )}

                    {/* 2. Zonal Church Group Golden Halo in Jabi */}
                    {isZonal && (
                      <circle
                        cx={church.x}
                        cy={church.y}
                        r="14"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.4"
                        strokeDasharray="2,3"
                        className="zonal-halo-spin"
                      />
                    )}

                    {/* 3. Base Aura Circle */}
                    <circle
                      cx={church.x}
                      cy={church.y}
                      r={pinRadius + 4}
                      fill={
                        hasRecentAddition
                          ? 'url(#zonalHqLightGradient)'
                          : isZonal
                          ? 'rgba(245, 158, 11, 0.25)'
                          : 'rgba(37, 99, 235, 0.15)'
                      }
                      opacity={isSelected || isHovered || hasRecentAddition ? 0.95 : 0.4}
                    />

                    {/* 4. Core Pin Point (Clean Light Mode Colors) */}
                    <circle
                      cx={church.x}
                      cy={church.y}
                      r={pinRadius}
                      fill={
                        hasRecentAddition
                          ? '#f59e0b'
                          : isZonal
                          ? '#d97706'
                          : '#2563eb'
                      }
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter="url(#pinGlow)"
                    />

                    {/* Center Core Dot */}
                    <circle
                      cx={church.x}
                      cy={church.y}
                      r={isZonal ? 2.5 : 2}
                      fill="#ffffff"
                    />

                    {/* 5. Floating +1 Real-Time Addition Badge */}
                    {hasRecentAddition && (
                      <g className="floating-addition-badge-group">
                        <rect
                          x={church.x - 30}
                          y={church.y - 28}
                          width="60"
                          height="16"
                          rx="8"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          filter="url(#lightDropShadow)"
                        />
                        <text
                          x={church.x}
                          y={church.y - 17}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill="#ffffff"
                        >
                          +{activeAddition.delta} SOUL{activeAddition.delta > 1 ? 'S' : ''}!
                        </text>
                      </g>
                    )}

                    {/* 6. Zonal Church 1 Crown Badge */}
                    {church.id === 'ch-zonal-church-1' && (
                      <text
                        x={church.x}
                        y={church.y - 9}
                        textAnchor="middle"
                        fontSize="9"
                      >
                        👑
                      </text>
                    )}

                    {/* 7. Church Micro Label on Zoom / Selection */}
                    {(zoom >= 1.5 || isSelected || isHovered || isZonal) && (
                      <text
                        x={church.x}
                        y={church.y + pinRadius + 9}
                        textAnchor="middle"
                        className={`church-pin-text-light ${
                          isZonal ? 'church-pin-text-zonal-light' : ''
                        } ${hasRecentAddition ? 'church-pin-text-lit-light' : ''}`}
                        fontSize={isZonal ? '8.5' : '7'}
                        fontWeight={isZonal || isSelected ? '800' : '600'}
                      >
                        {church.name.replace(/^CE\s+/i, '')}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Floating Map Cartographic Key / Legend (Bottom Left) */}
        <div className="map-cartographic-legend" aria-label="Map Key">
          <div className="legend-header-title">FCT ABUJA MAP KEY</div>
          <div className="legend-items-list">
            <div className="legend-key-row">
              <span className="key-line fct-border-key" />
              <span className="key-text">FCT Boundary (Official Border)</span>
            </div>
            <div className="legend-key-row">
              <span className="key-line expressway-key" />
              <span className="key-text">Major Arteries (Kubwa / Airport Rd)</span>
            </div>
            <div className="legend-key-row">
              <span className="key-dot zonal-key" />
              <span className="key-text">Zonal Church Group HQ (Jabi)</span>
            </div>
            <div className="legend-key-row">
              <span className="key-dot church-key" />
              <span className="key-text">CEAZ1 Churches (All 127 on 1 Map)</span>
            </div>
          </div>
        </div>

        {/* Selected Church Detail Card — Clean White HUD */}
        {activeChurch && (
          <aside className="map-church-hud-card light-hud" aria-label="Church Details">
            <button
              onClick={() => {
                setSelectedChurchId(null);
                setHoveredChurchId(null);
              }}
              className="hud-close-btn light-close-btn"
              title="Close Details"
              aria-label="Close"
            >
              <X size={15} />
            </button>

            <div className="hud-header">
              <div className="hud-badge-row">
                {activeChurch.isZonalHQ ? (
                  <span className="hud-pill-tag hud-pill-zonal-light">
                    <Award size={12} /> ZONAL CHURCH GROUP (JABI)
                  </span>
                ) : (
                  <span className="hud-pill-tag hud-pill-group-light">
                    <Building size={12} /> {activeChurch.groupName}
                  </span>
                )}

                {activeAdditions[activeChurch.id] && (
                  <span className="hud-pill-tag hud-pill-active-ping-light">
                    <Flame size={12} /> RECENT INFLOW!
                  </span>
                )}
              </div>

              <h2 className="hud-church-name light-name">{activeChurch.name}</h2>
              <div className="hud-meta-row light-meta">
                <span className="hud-church-code light-code">{activeChurch.code}</span>
                <span className="hud-church-district">📍 {activeChurch.districtName}</span>
                <span className="hud-church-region">({activeChurch.region})</span>
              </div>
            </div>

            <div className="hud-metrics-grid">
              <div className="hud-metric-box light-box">
                <span className="hud-metric-label light-lbl">Souls Won</span>
                <div className="hud-metric-value-row">
                  <span className="hud-metric-val light-souls-val">{activeChurch.soulsWon.toLocaleString()}</span>
                  <span className="hud-souls-tag light-tag">Souls</span>
                </div>
              </div>

              <div className="hud-metric-box light-box">
                <span className="hud-metric-label light-lbl">Campaign Target</span>
                <div className="hud-metric-value-row">
                  <span className="hud-metric-val light-target-val">{activeChurch.target.toLocaleString()}</span>
                  <span className="hud-target-tag light-tag">Target</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="hud-progress-block">
              <div className="hud-progress-labels light-progress-labels">
                <span>Harvest Goal Progress</span>
                <span className="hud-percent-text light-percent">{activeChurch.displayPercentage}</span>
              </div>
              <div className="hud-progress-track light-track">
                <div
                  className="hud-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, activeChurch.percentage))}%`,
                    background: activeChurch.isTargetExceeded
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : 'linear-gradient(90deg, #059669, #10b981)',
                  }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="hud-action-row">
              <button
                onClick={() => handleSimulateRealtimeAddition(activeChurch.id)}
                className="hud-action-btn hud-simulate-btn-light"
                title="Simulate a real-time addition for this church"
              >
                <Zap size={14} />
                <span>Simulate Addition (+1)</span>
              </button>

              <button
                onClick={() => focusOnCoordinates(activeChurch.x, activeChurch.y, 2.8)}
                className="hud-action-btn hud-zoom-btn-light"
                title="Zoom into this location"
              >
                <ZoomIn size={14} />
                <span>Focus Location</span>
              </button>
            </div>
          </aside>
        )}

        {/* Live Real-Time Radar Feed Drawer (Clean Light Mode) */}
        <div className="map-live-feed-dock light-feed-dock">
          <div className="feed-dock-header">
            <Radio size={14} className="feed-pulse-icon-light" />
            <span className="feed-title-light">REAL-TIME INFLOW RADAR</span>
            {recentFeed.length > 0 && (
              <span className="feed-count-badge-light">{recentFeed.length}</span>
            )}
          </div>

          <div className="feed-items-list">
            {recentFeed.length === 0 ? (
              <div className="feed-empty-hint-light">
                <span>Awaiting real-time additions across Abuja Zone 1...</span>
              </div>
            ) : (
              recentFeed.slice(0, 4).map((item, idx) => (
                <div
                  key={`${item.churchId}-${item.timestamp}-${idx}`}
                  onClick={() => {
                    const ch = ABUJA_CHURCH_LOCATIONS.find((c) => c.id === item.churchId);
                    if (ch) handleChurchClick(ch);
                  }}
                  className="feed-event-chip light-chip"
                >
                  <span className="feed-event-pulse-light" />
                  <div className="feed-event-body">
                    <span className="feed-church-name-light">{item.churchName}</span>
                    <span className="feed-delta-light">+{item.delta} Soul{item.delta > 1 ? 's' : ''} Won</span>
                  </div>
                  <ChevronRight size={13} className="feed-arrow" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
