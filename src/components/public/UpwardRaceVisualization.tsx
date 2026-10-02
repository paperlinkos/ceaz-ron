import React from 'react';
import { Trophy, Flag, BarChart2 } from 'lucide-react';
import type { GroupRaceCompetitor } from '../../services/counterService';
import { DEFAULT_GROUPS } from '../../services/organizationService';
import { getOfficialTarget } from '../../services/targetService';

interface UpwardRaceVisualizationProps {
  competitors: GroupRaceCompetitor[];
  variant?: 'classic' | 'barChart';
  fullHeight?: boolean;
  highlightGroupId?: string;
  highlightGroupName?: string;
  thresholdYellow?: number;
  thresholdGreen?: number;
}

/**
 * Returns clean monochrome + 2-accent color config:
 * - Accent 1 (ReachOut Green #008751) for active progress
 * - Accent 2 (Trophy Gold #d97706) for target achieved / exceeded (>=100%)
 */
export function getBarColorConfig(percentage: number) {
  if (percentage >= 100) {
    return {
      background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
      glow: '0 0 12px rgba(217, 119, 6, 0.4), inset 0 2px 4px rgba(255,255,255,0.6)',
      textColor: '#d97706',
      badgeBg: 'rgba(217, 119, 6, 0.12)',
      badgeBorder: 'rgba(217, 119, 6, 0.3)',
      tierName: '100%+ TARGET ACHIEVED',
    };
  }

  return {
    background: 'linear-gradient(180deg, #008751 0%, #006e42 100%)',
    glow: '0 0 10px rgba(0, 135, 81, 0.3), inset 0 2px 4px rgba(255,255,255,0.6)',
    textColor: '#008751',
    badgeBg: 'rgba(0, 135, 81, 0.1)',
    badgeBorder: 'rgba(0, 135, 81, 0.25)',
    tierName: 'IN PROGRESS',
  };
}

export const UpwardRaceVisualization: React.FC<UpwardRaceVisualizationProps> = ({
  competitors,
  variant = 'barChart',
  fullHeight = false,
  highlightGroupId,
  highlightGroupName,
}) => {
  const defaultCompetitors: GroupRaceCompetitor[] = DEFAULT_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    soulsWon: 0,
    percentage: 0,
    normalizedProgress: 0,
    target: getOfficialTarget('group', g.id) || 2000,
    hasTarget: true,
    isTargetExceeded: false,
    displayPercentage: '0%',
    weightedScore: 0,
  }));


  const activeCompetitors = competitors && competitors.length > 0 ? competitors : defaultCompetitors;

  if (variant === 'barChart') {
    const displayCompetitors = activeCompetitors;

    return (
      <div className="race-container bar-chart-variant" style={{ height: fullHeight ? '100%' : 'auto', display: 'flex', flexDirection: 'column', flex: fullHeight ? 1 : 'initial' }}>
        <div className="race-header">
          <div className="race-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={20} style={{ color: '#008751' }} />
              <h3 className="race-title" style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-race-text, #0f172a)', fontWeight: '900', margin: 0, letterSpacing: '0.04em' }}>
                GROUP PERFORMANCE BAR CHART
              </h3>
            </div>

            {/* 2-Tier Color Legend Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-legend-bg, rgba(0, 135, 81, 0.05))', padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--color-legend-border, rgba(0, 135, 81, 0.15))', fontSize: '0.70rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: '800' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} /> 100%+ TARGET ACHIEVED
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#008751', fontWeight: '800' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#008751' }} /> IN PROGRESS
              </span>
            </div>
          </div>
        </div>

        {displayCompetitors.length === 0 ? (
          <div className="race-empty-box">
            <span className="race-empty-badge">THE RACE IS BEGINNING</span>
            <p className="race-empty-text">
              Groups will appear here on the bar chart as soul-winning activity is recorded during the campaign.
            </p>
          </div>
        ) : (
          <div className="barchart-wrapper" style={{ position: 'relative', marginTop: '16px', width: '100%', overflowX: 'auto', flex: fullHeight ? 1 : 'initial', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* Target 100% Line Banner */}
            <div
              className="barchart-target-line"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingBottom: '8px',
                borderBottom: '2px dashed #008751',
                marginBottom: '16px',
              }}
            >
              <Flag size={14} style={{ color: '#008751' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#008751', letterSpacing: '0.05em' }}>
                FINISH LINE • 100% TARGET GOAL
              </span>
            </div>

            {/* Grid Chart Columns Area for ALL Groups */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${displayCompetitors.length}, minmax(42px, 1fr))`,
                gap: '6px',
                alignItems: 'flex-end',
                minHeight: fullHeight ? '380px' : '260px',
                height: fullHeight ? 'calc(100vh - 360px)' : 'auto',
                paddingBottom: '8px',
                width: '100%',
                flex: fullHeight ? 1 : 'initial',
              }}
            >
              {displayCompetitors.map((comp, idx) => {
                const heightPct = Math.max(
                  5,
                  Math.min(100, (comp.normalizedProgress ?? comp.percentage / 100) * 100)
                );
                const displayPct = comp.displayPercentage || `${comp.percentage}%`;
                const colorConfig = getBarColorConfig(comp.percentage);

                const isMyGroup = Boolean(
                  (highlightGroupId && comp.id === highlightGroupId) ||
                  (highlightGroupName && (comp.name.toLowerCase().includes(highlightGroupName.toLowerCase()) || (comp.code && highlightGroupName.toLowerCase().includes(comp.code.toLowerCase()))))
                );

                const isFirst = idx === 0;
                const rankColor = isFirst ? '#d97706' : '#64748b';

                return (
                  <div
                    key={comp.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      position: 'relative',
                    }}
                    title={`${comp.name} (${comp.code || 'No Code'}): ${comp.soulsWon.toLocaleString()} / ${comp.target > 0 ? comp.target.toLocaleString() : 'Not Set'} souls (${displayPct})`}
                  >
                    {isMyGroup && (
                      <span
                        style={{
                          background: '#008751',
                          color: '#ffffff',
                          fontSize: '0.58rem',
                          fontWeight: '900',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0, 135, 81, 0.4)',
                          marginBottom: '2px',
                        }}
                      >
                        MY GROUP
                      </span>
                    )}

                    {/* Vertical Bar Track Column */}
                    <div
                      style={{
                        width: '100%',
                        maxWidth: fullHeight ? '34px' : '22px',
                        height: fullHeight ? 'calc(100vh - 440px)' : '180px',
                        minHeight: fullHeight ? '300px' : '180px',
                        background: isMyGroup ? 'rgba(0, 135, 81, 0.12)' : 'var(--color-bar-track-bg, rgba(0, 135, 81, 0.05))',
                        borderRadius: '6px 6px 0 0',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        border: isMyGroup ? '2px solid #008751' : '1px solid var(--color-bar-track-border, rgba(0, 135, 81, 0.15))',
                        overflow: 'hidden',
                        boxShadow: isMyGroup ? '0 0 12px rgba(0, 135, 81, 0.3)' : 'none',
                      }}
                    >
                      {/* Bar Filled with Accent Color */}
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          background: colorConfig.background,
                          borderRadius: '3px 3px 0 0',
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: colorConfig.glow,
                          borderTop: '2px solid #ffffff',
                        }}
                      />
                    </div>

                    {/* High-Contrast Monochrome Labels Under Bar */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        width: '100%',
                        gap: '2px',
                      }}
                    >
                      {/* Rank */}
                      <span style={{ fontSize: '0.72rem', fontWeight: '900', color: rankColor, fontFamily: "'Orbitron', sans-serif" }}>
                        #{idx + 1}
                      </span>

                      {/* Group Code / Name */}
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: 'var(--color-race-text, #0f172a)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '52px',
                          display: 'block',
                        }}
                      >
                        {comp.code ? comp.code.replace(/^GRP-/, '') : comp.name}
                      </span>

                      {/* Percentage */}
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '900',
                          color: colorConfig.textColor,
                          lineHeight: '1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '1px',
                          fontFamily: "'Share Tech Mono', monospace",
                        }}
                      >
                        {displayPct}
                      </span>

                      {/* Souls Count Readout (High Contrast Slate) */}
                      <span
                        style={{
                          fontSize: '0.62rem',
                          color: '#475569',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          fontFamily: "'Share Tech Mono', monospace",
                        }}
                      >
                        {comp.soulsWon.toLocaleString()}/{comp.target >= 1000 ? `${(comp.target / 1000).toFixed(0)}k` : comp.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="race-container">
      <div className="race-header">
        <div className="race-title-group">
          <Trophy size={20} className="text-green-accent" />
          <h3 className="race-title">UPWARD RACE TO TARGET</h3>
        </div>
        <p className="race-subtitle">
          Groups climbing vertically toward their target line. Higher percentage achievement rises closer to the finish line!
        </p>
      </div>
    </div>
  );
};
