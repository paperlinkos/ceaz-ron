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
  ABUJA_DISTRICTS,
  type ChurchMapLocation,
  type AbujaDistrict,
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

  // Selected church and active filter
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [hoveredChurchId, setHoveredChurchId] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
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

  // Cleanup old active addition glows after 25 seconds
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

  // Filtered churches based on search and district
  const filteredChurches = useMemo(() => {
    return ABUJA_CHURCH_LOCATIONS.filter((church) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        church.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        church.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        church.districtName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedDistrict === 'all') return true;
      if (selectedDistrict === 'jabi') return church.districtKey === 'jabi';
      if (selectedDistrict === 'central') return church.districtKey === 'cbd' || church.districtKey === 'garki' || church.districtKey === 'asokoro';
      if (selectedDistrict === 'utako') return church.districtKey === 'utako' || church.districtKey === 'wuye';
      if (selectedDistrict === 'gwarinpa') return church.districtKey === 'gwarinpa' || church.districtKey === 'dawaki' || church.districtKey === 'karsana';
      if (selectedDistrict === 'kubwa') return church.districtKey === 'kubwa' || church.districtKey === 'byazhin';
      if (selectedDistrict === 'bwari') return church.districtKey === 'bwari' || church.districtKey === 'ushafa';
      if (selectedDistrict === 'lokogoma') return church.districtKey === 'lokogoma' || church.districtKey === 'apo' || church.districtKey === 'durumi' || church.districtKey === 'kabusa';
      if (selectedDistrict === 'lugbe') return church.districtKey === 'lugbe' || church.districtKey === 'iddosarki';
      if (selectedDistrict === 'karmo') return church.districtKey === 'karmo' || church.districtKey === 'lifecamp' || church.districtKey === 'kado' || church.districtKey === 'jahi';
      if (selectedDistrict === 'gwagwalada') return church.districtKey === 'gwagwalada' || church.districtKey === 'zuba' || church.districtKey === 'tungamaje';
      if (selectedDistrict === 'kuje') return church.districtKey === 'kuje' || church.districtKey === 'kwali';

      return true;
    });
  }, [searchQuery, selectedDistrict]);

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

  // Pan to a specific church or district
  const focusOnCoordinates = (targetX: number, targetY: number, newZoom: number = 2) => {
    // Canvas is 1200 x 900
    // Centering formula: panX = (1200 / 2 - targetX) * newZoom, panY = (900 / 2 - targetY) * newZoom
    const newPanX = (600 - targetX) * newZoom;
    const newPanY = (450 - targetY) * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleSelectDistrict = (dist: AbujaDistrict) => {
    setSelectedDistrict(dist.key);
    if (dist.key === 'all') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      focusOnCoordinates(dist.centerX, dist.centerY, dist.isZonalCentre ? 2.4 : 1.8);
    }
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
    setSelectedDistrict('all');
    setSelectedChurchId(null);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary button
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

  // Demo simulation trigger to preview the real-time light-up animation
  const handleSimulateRealtimeAddition = (targetChurchId?: string) => {
    const candidate = targetChurchId
      ? ABUJA_CHURCH_LOCATIONS.find((c) => c.id === targetChurchId)
      : filteredChurches[Math.floor(Math.random() * filteredChurches.length)];

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

    // Update local progress count so number visibly increases
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

    // If candidate isn't in viewport, focus lightly
    if (zoom < 1.3) {
      focusOnCoordinates(candidate.x, candidate.y, 1.6);
    }
  };

  return (
    <div className="abuja-map-page-wrapper" ref={containerRef}>
      {/* Top Map Header & Controls Strip */}
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
              Real-Time Church Locations, Soul Winning Inflow & Progress Across the Federal Capital Territory
            </p>
          </div>

          <div className="abuja-map-stats-pills">
            <div className="map-stat-pill">
              <Building size={14} className="text-gold" />
              <div>
                <span className="map-stat-val">127</span>
                <span className="map-stat-lbl">Churches Tracked</span>
              </div>
            </div>

            <div className="map-stat-pill">
              <Target size={14} className="text-emerald" />
              <div>
                <span className="map-stat-val">{zonalTarget.toLocaleString()}</span>
                <span className="map-stat-lbl">Campaign Goal</span>
              </div>
            </div>

            <div className="map-stat-pill primary-stat-pill">
              <Flame size={14} className="text-gold" />
              <div>
                <span className="map-stat-val">{totalZonalSouls.toLocaleString()}</span>
                <span className="map-stat-lbl">Zonal Souls Won</span>
              </div>
            </div>

            {/* Realtime test addition button */}
            <button
              onClick={() => handleSimulateRealtimeAddition('ch-zonal-church-1')}
              className="map-simulate-addition-btn"
              title="Click to preview real-time addition radar light-up on Zonal Church 1 (Jabi)"
            >
              <Zap size={14} />
              <span>TEST LIVE PING (JABI)</span>
            </button>
          </div>
        </div>

        {/* District Quick Filter Chips */}
        <div className="abuja-map-filter-strip">
          <div className="district-chips-scroller">
            {ABUJA_DISTRICTS.map((dist) => {
              const isActive = selectedDistrict === dist.key;
              return (
                <button
                  key={dist.key}
                  onClick={() => handleSelectDistrict(dist)}
                  className={`district-filter-chip ${isActive ? 'chip-active' : ''} ${
                    dist.isZonalCentre ? 'chip-zonal-highlight' : ''
                  }`}
                >
                  {dist.isZonalCentre && <Award size={13} className="text-gold" />}
                  <span>{dist.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="map-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search 127 churches or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="map-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="search-clear-btn" aria-label="Clear Search">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Map Interactive Stage */}
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
              // Quick focus on Jabi Zonal Cathedral
              setSelectedDistrict('jabi');
              focusOnCoordinates(670, 465, 2.4);
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

        {/* SVG Map Canvas */}
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
            className="abuja-fct-svg"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '600px 450px',
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <defs>
              {/* Radial gradients for radar glow and ping waves */}
              <radialGradient id="zonalHqGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
                <stop offset="60%" stopColor="#00ff87" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#003b22" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="churchActiveGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00ffc2" stopOpacity="1" />
                <stop offset="70%" stopColor="#008751" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#051f15" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="lakeWaterGradient" cx="45%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#00695c" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#002d25" stopOpacity="0.9" />
              </radialGradient>

              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="intensePulseGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" result="blur1" />
                <feGaussianBlur stdDeviation="16" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid Coordinates Background */}
            <g className="map-grid-layer" opacity="0.25">
              {Array.from({ length: 13 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 100}
                  y1="0"
                  x2={i * 100}
                  y2="900"
                  stroke="#1e3a2f"
                  strokeWidth="0.8"
                  strokeDasharray="4,8"
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 100}
                  x2="1200"
                  y2={i * 100}
                  stroke="#1e3a2f"
                  strokeWidth="0.8"
                  strokeDasharray="4,8"
                />
              ))}
            </g>

            {/* FCT Abuja Outer Perimeter Boundary Shape */}
            <g className="map-fct-boundary-layer">
              <path
                d="M 280,180 Q 420,120 600,100 Q 820,70 950,110 Q 1060,170 1020,340 Q 990,480 940,620 Q 880,780 720,840 Q 520,860 360,820 Q 180,780 120,680 Q 80,560 140,420 Q 190,260 280,180 Z"
                fill="#071912"
                stroke="#174431"
                strokeWidth="2.5"
                opacity="0.85"
              />
              <path
                d="M 440,240 Q 580,210 740,220 Q 890,260 880,410 Q 860,570 780,680 Q 640,710 500,680 Q 380,620 400,470 Q 410,330 440,240 Z"
                fill="#0a2219"
                stroke="#1f5840"
                strokeWidth="1.5"
                opacity="0.7"
              />
            </g>

            {/* Major Arteries / Expressways in Abuja */}
            <g className="map-highways-layer">
              {/* Outer Northern Expressway / Kubwa Expressway (Zuba -> Kubwa -> Gwarinpa -> Central) */}
              <path
                d="M 330,280 Q 420,270 515,260 Q 580,310 600,370 Q 640,430 730,460 Q 790,485 850,505"
                fill="none"
                stroke="#2a664c"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d="M 330,280 Q 420,270 515,260 Q 580,310 600,370 Q 640,430 730,460 Q 790,485 850,505"
                fill="none"
                stroke="#00ff87"
                strokeWidth="1.2"
                strokeDasharray="6,6"
                opacity="0.6"
              />

              {/* Airport Road / Umaru Musa Yar'Adua Way (Airport -> Lugbe -> City Gate) */}
              <path
                d="M 460,700 Q 530,640 560,610 Q 610,570 650,530 Q 700,500 785,485"
                fill="none"
                stroke="#2a664c"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d="M 460,700 Q 530,640 560,610 Q 610,570 650,530 Q 700,500 785,485"
                fill="none"
                stroke="#FFD700"
                strokeWidth="1.2"
                strokeDasharray="8,6"
                opacity="0.55"
              />

              {/* Nnamdi Azikiwe Ring Road (Outer Loop around Jabi, Utako, Wuye, Garki) */}
              <path
                d="M 600,370 Q 650,410 660,450 Q 710,520 780,550 Q 820,530 830,470 Q 800,420 740,390 Z"
                fill="none"
                stroke="#1f5840"
                strokeWidth="2"
                strokeDasharray="3,3"
                opacity="0.65"
              />

              {/* Obafemi Awolowo Way (Linking Jabi directly to Central Area) */}
              <path
                d="M 640,465 L 720,455 L 785,485"
                fill="none"
                stroke="#00ffc2"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity="0.7"
              />
            </g>

            {/* JABI LAKE: Special Glowing Luminous Lake in Jabi District */}
            <g className="map-jabi-lake-layer" filter="url(#neonGlow)">
              <path
                d="M 648,460 C 655,445 675,448 688,455 C 702,462 708,476 695,488 C 682,500 660,498 646,485 C 636,475 640,466 648,460 Z"
                fill="url(#lakeWaterGradient)"
                stroke="#00ffc2"
                strokeWidth="1.5"
                opacity="0.85"
              />
              <text
                x="672"
                y="476"
                textAnchor="middle"
                fontSize="7.5"
                fontWeight="800"
                fill="#ffffff"
                opacity="0.9"
                letterSpacing="1"
              >
                🌊 JABI LAKE
              </text>
            </g>

            {/* Special ZONAL CHURCH GROUP HQ DISTRICT HIGHLIGHT in Jabi */}
            <g className="map-jabi-district-highlight">
              {/* Pulsing boundary around Jabi */}
              <rect
                x="632"
                y="434"
                width="84"
                height="72"
                rx="14"
                fill="rgba(0, 135, 81, 0.12)"
                stroke="#FFD700"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                opacity="0.9"
                filter="url(#neonGlow)"
              />
              <text
                x="674"
                y="444"
                textAnchor="middle"
                fontSize="8"
                fontWeight="900"
                fill="#FFD700"
                letterSpacing="0.8"
              >
                🏛️ ZONAL CHURCH GROUP HQ (JABI)
              </text>
            </g>

            {/* District Labels */}
            <g className="map-district-labels-layer">
              <text x="590" y="358" className="district-label">GWARINPA ESTATE</text>
              <text x="520" y="248" className="district-label">KUBWA</text>
              <text x="720" y="438" className="district-label">UTAKO</text>
              <text x="730" y="525" className="district-label">WUYE</text>
              <text x="795" y="472" className="district-label">CENTRAL BUSINESS DIST.</text>
              <text x="800" y="562" className="district-label">GARKI</text>
              <text x="858" y="495" className="district-label">ASOKORO</text>
              <text x="725" y="638" className="district-label">LOKOGOMA</text>
              <text x="575" y="428" className="district-label">KARMO & DAPE</text>
              <text x="625" y="298" className="district-label">DAWAKI</text>
              <text x="830" y="128" className="district-label">BWARI</text>
              <text x="785" y="188" className="district-label">USHAFA</text>
              <text x="420" y="278" className="district-label">DEI-DEI</text>
              <text x="555" y="648" className="district-label">AIRPORT RD / LUGBE</text>
              <text x="430" y="758" className="district-label">KUJE</text>
              <text x="220" y="658" className="district-label">GWAGWALADA</text>
              <text x="340" y="278" className="district-label">ZUBA</text>
            </g>

            {/* CHURCH LOCATION POINTS & REAL-TIME LIGHT-UP BEACONS */}
            <g className="map-church-pins-layer">
              {filteredChurches.map((church) => {
                const progress = churchProgressMap.get(church.id);
                const soulsCount = progress?.actual || 0;
                const isSelected = selectedChurchId === church.id;
                const isHovered = hoveredChurchId === church.id;
                const activeAddition = activeAdditions[church.id];
                const hasRecentAddition = Boolean(activeAddition);

                // Zonal Church Group (Jabi) gets prominent gold styling
                const isZonal = church.isZonalHQ;
                const pinRadius = isSelected || isHovered ? 8 : isZonal ? 6.5 : 5;

                return (
                  <g
                    key={church.id}
                    className={`church-pin-group ${hasRecentAddition ? 'pin-active-glow' : ''} ${
                      isSelected ? 'pin-selected' : ''
                    } ${isZonal ? 'pin-zonal-hq' : ''}`}
                    onClick={() => handleChurchClick(church)}
                    onMouseEnter={() => setHoveredChurchId(church.id)}
                    onMouseLeave={() => setHoveredChurchId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${church.name} (${soulsCount} souls won)`}</title>
                    {/* 1. Real-time Addition Radar Expansion Wave Rings */}
                    {hasRecentAddition && (
                      <g className="radar-shockwave-rings">
                        <circle
                          cx={church.x}
                          cy={church.y}
                          r="12"
                          className="radar-expansion-ring-1"
                        />
                        <circle
                          cx={church.x}
                          cy={church.y}
                          r="22"
                          className="radar-expansion-ring-2"
                        />
                        <circle
                          cx={church.x}
                          cy={church.y}
                          r="34"
                          className="radar-expansion-ring-3"
                        />
                      </g>
                    )}

                    {/* 2. Zonal Church Group Permanent Golden Halo in Jabi */}
                    {isZonal && (
                      <circle
                        cx={church.x}
                        cy={church.y}
                        r="14"
                        fill="none"
                        stroke="#FFD700"
                        strokeWidth="1.2"
                        strokeDasharray="2,3"
                        opacity="0.8"
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
                          ? 'url(#zonalHqGradient)'
                          : isZonal
                          ? 'rgba(255, 215, 0, 0.35)'
                          : 'rgba(0, 255, 135, 0.25)'
                      }
                      opacity={isSelected || isHovered || hasRecentAddition ? 0.9 : 0.4}
                      filter={hasRecentAddition ? 'url(#intensePulseGlow)' : undefined}
                    />

                    {/* 4. Core Pin Point */}
                    <circle
                      cx={church.x}
                      cy={church.y}
                      r={pinRadius}
                      fill={hasRecentAddition ? '#FFD700' : isZonal ? '#FFD700' : '#00ff87'}
                      stroke={isSelected ? '#ffffff' : isZonal ? '#92400e' : '#064e3b'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter="url(#neonGlow)"
                    />

                    {/* Center Core Dot */}
                    <circle
                      cx={church.x}
                      cy={church.y}
                      r={isZonal ? 2.8 : 2}
                      fill={isZonal ? '#78350f' : '#ffffff'}
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
                          fill="#FFD700"
                          stroke="#ffffff"
                          strokeWidth="1"
                          filter="url(#neonGlow)"
                        />
                        <text
                          x={church.x}
                          y={church.y - 17}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill="#000000"
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

                    {/* 7. Church Micro Label on Zoom */}
                    {(zoom >= 1.5 || isSelected || isHovered || isZonal) && (
                      <text
                        x={church.x}
                        y={church.y + pinRadius + 9}
                        textAnchor="middle"
                        className={`church-pin-text ${isZonal ? 'church-pin-text-zonal' : ''} ${
                          hasRecentAddition ? 'church-pin-text-lit' : ''
                        }`}
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

        {/* Selected Church HUD Detail Modal / Drawer Card */}
        {activeChurch && (
          <aside className="map-church-hud-card" aria-label="Church Details">
            <button
              onClick={() => {
                setSelectedChurchId(null);
                setHoveredChurchId(null);
              }}
              className="hud-close-btn"
              title="Close Details"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="hud-header">
              <div className="hud-badge-row">
                {activeChurch.isZonalHQ ? (
                  <span className="hud-pill-tag hud-pill-zonal">
                    <Award size={12} /> ZONAL CHURCH GROUP (JABI)
                  </span>
                ) : (
                  <span className="hud-pill-tag hud-pill-group">
                    <Building size={12} /> {activeChurch.groupName}
                  </span>
                )}

                {activeAdditions[activeChurch.id] && (
                  <span className="hud-pill-tag hud-pill-active-ping">
                    <Flame size={12} /> RECENT INFLOW!
                  </span>
                )}
              </div>

              <h2 className="hud-church-name">{activeChurch.name}</h2>
              <div className="hud-meta-row">
                <span className="hud-church-code">{activeChurch.code}</span>
                <span className="hud-church-district">📍 {activeChurch.districtName}</span>
                <span className="hud-church-region">({activeChurch.region})</span>
              </div>
            </div>

            <div className="hud-metrics-grid">
              <div className="hud-metric-box">
                <span className="hud-metric-label">Souls Won</span>
                <div className="hud-metric-value-row">
                  <span className="hud-metric-val hud-souls-val">{activeChurch.soulsWon.toLocaleString()}</span>
                  <span className="hud-souls-tag">Souls</span>
                </div>
              </div>

              <div className="hud-metric-box">
                <span className="hud-metric-label">Campaign Target</span>
                <div className="hud-metric-value-row">
                  <span className="hud-metric-val">{activeChurch.target.toLocaleString()}</span>
                  <span className="hud-target-tag">Target</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="hud-progress-block">
              <div className="hud-progress-labels">
                <span>Harvest Goal Progress</span>
                <span className="hud-percent-text">{activeChurch.displayPercentage}</span>
              </div>
              <div className="hud-progress-track">
                <div
                  className="hud-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, activeChurch.percentage))}%`,
                    background: activeChurch.isTargetExceeded
                      ? 'linear-gradient(90deg, #FFD700, #ff8c00)'
                      : 'linear-gradient(90deg, #008751, #00ff87)',
                  }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="hud-action-row">
              <button
                onClick={() => handleSimulateRealtimeAddition(activeChurch.id)}
                className="hud-action-btn hud-simulate-btn"
                title="Simulate a real-time addition for this church"
              >
                <Zap size={14} />
                <span>Simulate Addition (+1)</span>
              </button>

              <button
                onClick={() => focusOnCoordinates(activeChurch.x, activeChurch.y, 2.8)}
                className="hud-action-btn hud-zoom-btn"
                title="Zoom into this location"
              >
                <ZoomIn size={14} />
                <span>Focus Location</span>
              </button>
            </div>
          </aside>
        )}

        {/* Live Real-Time Radar Feed Drawer */}
        <div className="map-live-feed-dock">
          <div className="feed-dock-header">
            <Radio size={14} className="feed-pulse-icon" />
            <span className="feed-title">REAL-TIME ADDITIONS RADAR</span>
            {recentFeed.length > 0 && (
              <span className="feed-count-badge">{recentFeed.length}</span>
            )}
          </div>

          <div className="feed-items-list">
            {recentFeed.length === 0 ? (
              <div className="feed-empty-hint">
                <span>Awaiting real-time soul additions across Abuja Zone 1...</span>
              </div>
            ) : (
              recentFeed.slice(0, 4).map((item, idx) => (
                <div
                  key={`${item.churchId}-${item.timestamp}-${idx}`}
                  onClick={() => {
                    const ch = ABUJA_CHURCH_LOCATIONS.find((c) => c.id === item.churchId);
                    if (ch) handleChurchClick(ch);
                  }}
                  className="feed-event-chip"
                >
                  <span className="feed-event-pulse" />
                  <div className="feed-event-body">
                    <span className="feed-church-name">{item.churchName}</span>
                    <span className="feed-delta">+{item.delta} Soul{item.delta > 1 ? 's' : ''} Won</span>
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
