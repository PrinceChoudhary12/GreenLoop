import React from 'react';
import './charts.css';

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
  percentage?: number;
}

export interface DonutChartProps {
  title?: string;
  subtitle?: string;
  data: DonutSegment[];
  emptyText?: string;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
  ariaLabel?: string;
  testId?: string;
}

const DEFAULT_COLORS = [
  '#2d6a4f', // Forest Green
  '#40916c', // Medium Green
  '#52b788', // Light Green
  '#74c69d', // Mint
  '#2563eb', // Ocean Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ea580c', // Orange
  '#065f46', // Dark Pine
  '#64748b', // Slate
];

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  data = [],
  emptyText = 'No data available',
  showLegend = true,
  centerLabel,
  centerValue,
  ariaLabel,
  testId = 'donut-chart',
}) => {
  const total = React.useMemo(() => {
    return data.reduce((sum, item) => sum + (Number.isFinite(item.value) && item.value > 0 ? item.value : 0), 0);
  }, [data]);

  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const segments = data.map((item, index) => {
    const val = Number.isFinite(item.value) && item.value > 0 ? item.value : 0;
    const ratio = total > 0 ? val / total : 0;
    const segmentLength = ratio * circumference;
    const offset = accumulatedOffset;
    accumulatedOffset += segmentLength;
    const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    const computedPct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

    return {
      ...item,
      val,
      color,
      segmentLength,
      offset,
      displayPct: item.percentage !== undefined ? item.percentage.toFixed(1) : computedPct,
    };
  });

  const chartTitle = title || 'Distribution Chart';
  const accessibleDescription =
    total > 0
      ? `Donut chart depicting ${data.length} segments with total value of ${total}.`
      : emptyText;

  return (
    <div className="chart-card" data-testid={testId}>
      {(title || subtitle) && (
        <div className="chart-card-header">
          <div>
            {title && <h3 className="chart-card-title">{title}</h3>}
            {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
          </div>
        </div>
      )}

      {total <= 0 || data.length === 0 ? (
        <div className="chart-empty-state" data-testid={`${testId}-empty`}>
          <span className="chart-empty-icon" aria-hidden="true">📊</span>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="donut-layout">
          <div className="donut-svg-wrapper">
            <svg
              viewBox="0 0 100 100"
              className="svg-chart"
              role="img"
              aria-label={ariaLabel || chartTitle}
            >
              <title>{chartTitle}</title>
              <desc>{accessibleDescription}</desc>

              {/* Background baseline ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--color-border-subtle, #e2e8f0)"
                strokeWidth={strokeWidth}
              />

              {/* Proportional Donut segments */}
              <g transform="rotate(-90 50 50)">
                {segments.map((seg, idx) => {
                  if (seg.segmentLength <= 0) return null;
                  return (
                    <circle
                      key={`donut-seg-${idx}`}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${seg.segmentLength} ${circumference}`}
                      strokeDashoffset={-seg.offset}
                      strokeLinecap="butt"
                    />
                  );
                })}
              </g>

              {/* Center text display */}
              <text
                x="50"
                y={centerLabel ? '47' : '53'}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="var(--color-text-primary, #1e293b)"
              >
                {centerValue !== undefined ? centerValue : total}
              </text>
              {centerLabel && (
                <text
                  x="50"
                  y="59"
                  textAnchor="middle"
                  fontSize="5"
                  fill="var(--color-text-muted, #64748b)"
                >
                  {centerLabel}
                </text>
              )}
            </svg>
          </div>

          {showLegend && (
            <div className="donut-legend" role="list" aria-label="Chart Legend">
              {segments.map((seg, idx) => (
                <div key={`legend-${idx}`} className="legend-item" role="listitem">
                  <div className="legend-color-tag">
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden="true"
                    />
                    <span>{seg.label}</span>
                  </div>
                  <div className="legend-value-group">
                    <span>{seg.val}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                      ({seg.displayPct}%)
                    </span>
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
