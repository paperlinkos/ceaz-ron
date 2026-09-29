import React from 'react';
import { Trophy } from 'lucide-react';
import type { OrganizationProgress } from '../../types/target';
import type { GroupRaceCompetitor } from '../../services/counterService';
import { DEFAULT_GROUPS } from '../../services/organizationService';
import { getOfficialTarget } from '../../services/targetService';

export interface AppleProgressRingsWidgetProps {
  groups?: (OrganizationProgress | GroupRaceCompetitor)[];
  title?: string;
  onViewAll?: () => void;
  className?: string;
}

export const AppleProgressRingsWidget: React.FC<AppleProgressRingsWidgetProps> = ({
  groups,
  title = 'TOP 5 PERFORMING GROUPS',
  onViewAll,
  className = '',
}) => {
  // 1. Normalize incoming groups or initialize with real 0% zonal groups
  let allGroups: Array<{
    id: string;
    name: string;
    percentage: number;
    actual: number;
    target: number;
  }> = [];

  if (groups && groups.length > 0) {
    allGroups = groups.map((g, idx) => {
      const id = ('organizationId' in g ? g.organizationId : g.id) || `grp-${idx}`;
      const name = ('organizationName' in g ? g.organizationName : g.name) || 'Group';
      const pct = typeof g.percentage === 'number' && !isNaN(g.percentage) ? g.percentage : 0;
      const actual = ('actual' in g ? g.actual : g.soulsWon) || 0;
      const target = g.target || getOfficialTarget('group', id) || 1000;

      return {
        id,
        name,
        percentage: Math.round(pct * 10) / 10,
        actual,
        target,
      };
    });
  } else {
    // When no records or groups loaded yet, start strictly with real zone groups at 0%
    allGroups = DEFAULT_GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      percentage: 0,
      actual: 0,
      target: getOfficialTarget('group', g.id) || 2000,
    }));
  }

  // 2. Sort ALL groups strictly by percentage descending, then actual souls won descending
  allGroups.sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    return b.actual - a.actual;
  });

  // 3. Take the dynamic Top 5
  const topFive = allGroups.slice(0, 5);

  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.63

  return (
    <div className={`apple-rings-widget-container ${className}`}>
      {/* WIDGET HEADER */}
      <div className="apple-rings-widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} style={{ color: '#d97706' }} />
          <span className="apple-rings-title">{title}</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#008751',
              background: 'rgba(0, 135, 81, 0.1)',
              padding: '2px 8px',
              borderRadius: '8px',
            }}
          >
            BY % TARGET
          </span>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="apple-rings-badge-btn"
            title="View full Group Race standings"
          >
            VIEW RACE STANDINGS →
          </button>
        )}
      </div>

      {/* HORIZONTAL ROW OF APPLE CIRCULAR PROGRESS RINGS */}
      <div className="apple-rings-row">
        {topFive.map((group, index) => {
          const progressFraction = Math.min(1, Math.max(0, group.percentage / 100));
          const strokeOffset = circumference - progressFraction * circumference;
          const isFirst = index === 0 && group.percentage > 0;

          return (
            <div key={group.id} className="apple-ring-item">
              {/* CIRCULAR SVG PROGRESS RING */}
              <div className="apple-ring-svg-box">
                <svg
                  width="88"
                  height="88"
                  viewBox="0 0 88 88"
                  className="apple-ring-svg"
                  style={{ display: 'block' }}
                >
                  {/* Background Track Circle (ALWAYS CLEARLY VISIBLE) */}
                  <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    fill="none"
                    stroke="rgba(0, 135, 81, 0.15)"
                    strokeWidth="8"
                    className="apple-ring-track"
                  />
                  {/* Active Foreground Progress Circle Based Strictly on Percentage */}
                  <circle
                    cx="44"
                    cy="44"
                    r={radius}
                    fill="none"
                    stroke={isFirst ? '#d97706' : '#008751'}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                    className={`apple-ring-progress ${isFirst ? 'ring-gold' : 'ring-green'}`}
                  />
                </svg>

                {/* Center Content Inside Circle (Trophy for #1 if >0, Rank # for rest) */}
                <div className="apple-ring-center-content">
                  {isFirst ? (
                    <Trophy size={20} style={{ color: '#d97706' }} />
                  ) : (
                    <span className="apple-ring-rank-text" style={{ color: isFirst ? '#d97706' : '#475569' }}>
                      #{index + 1}
                    </span>
                  )}
                </div>
              </div>

              {/* PERCENTAGE READOUT DIRECTLY BENEATH CIRCLE */}
              <div className={`apple-ring-percentage ${isFirst ? 'percent-gold' : 'percent-green'}`}>
                {group.percentage}%
              </div>

              {/* GROUP NAME */}
              <div className="apple-ring-group-name" title={group.name}>
                {group.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
