import React from 'react';
import './charts.css';

export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
  sublabel?: string;
  color?: string;
  secondaryColor?: string;
}

export interface BarChartProps {
  title?: string;
  subtitle?: string;
  data: BarChartItem[];
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  emptyText?: string;
  showValues?: boolean;
  showLegend?: boolean;
  ariaLabel?: string;
  testId?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle,
  data = [],
  primaryLabel = 'Primary Metric',
  secondaryLabel = 'Secondary Metric',
  primaryColor = 'var(--color-brand-primary, #2d6a4f)',
  secondaryColor = 'var(--color-brand-light, #52b788)',
  emptyText = 'No performance data available',
  showValues = true,
  showLegend = true,
  ariaLabel,
  testId = 'bar-chart',
}) => {
  const chartW = 600;
  const chartH = 260;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 45;

  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const hasSecondary = data.some(
    (d) => d.secondaryValue !== undefined && Number.isFinite(d.secondaryValue),
  );

  const rawMax = React.useMemo(() => {
    let max = 0;
    for (const d of data) {
      const v1 = Number(d.value) || 0;
      if (v1 > max) max = v1;
      if (d.secondaryValue !== undefined) {
        const v2 = Number(d.secondaryValue) || 0;
        if (v2 > max) max = v2;
      }
    }
    return max;
  }, [data]);

  const yTicks = React.useMemo(() => {
    const targetMax = rawMax > 0 ? rawMax : 4;
    const step = Math.max(1, Math.ceil(targetMax / 4));
    const niceMax = step * 4;
    return [0, step, step * 2, step * 3, niceMax];
  }, [rawMax]);

  const yMax = yTicks[yTicks.length - 1];

  const getY = (val: number) => {
    const safeVal = Number.isFinite(val) && val >= 0 ? val : 0;
    return padTop + plotH - (safeVal / yMax) * plotH;
  };

  const getBarH = (val: number) => {
    const safeVal = Number.isFinite(val) && val >= 0 ? val : 0;
    return (safeVal / yMax) * plotH;
  };

  const slotW = data.length > 0 ? plotW / data.length : plotW;
  const maxGroupW = Math.min(48, slotW * 0.7);
  const singleBarW = hasSecondary ? Math.max(8, (maxGroupW - 4) / 2) : maxGroupW;

  const chartTitle = title || 'Operational Performance Chart';
  const accessibleDescription =
    data.length > 0
      ? `Bar chart showing metrics for ${data.length} items.`
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

      {data.length === 0 ? (
        <div className="chart-empty-state" data-testid={`${testId}-empty`}>
          <span className="chart-empty-icon" aria-hidden="true">📊</span>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="svg-chart-container">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="svg-chart"
            role="img"
            aria-label={ariaLabel || chartTitle}
          >
            <title>{chartTitle}</title>
            <desc>{accessibleDescription}</desc>

            {/* Y-Axis Horizontal Grid Lines */}
            {yTicks.map((tickVal, idx) => {
              const y = getY(tickVal);
              return (
                <g key={`ytick-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotW}
                    y2={y}
                    stroke="var(--color-border-subtle, #e2e8f0)"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--color-text-muted, #64748b)"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Baseline */}
            <line
              x1={padLeft}
              y1={padTop + plotH}
              x2={padLeft + plotW}
              y2={padTop + plotH}
              stroke="var(--color-border-subtle, #cbd5e1)"
              strokeWidth="1.5"
            />

            {/* Grouped Bars */}
            {data.map((item, idx) => {
              const centerX = padLeft + idx * slotW + slotW / 2;
              const v1 = Number(item.value) || 0;
              const h1 = getBarH(v1);
              const y1 = getY(v1);
              const col1 = item.color || primaryColor;

              const v2 = Number(item.secondaryValue) || 0;
              const h2 = getBarH(v2);
              const y2 = getY(v2);
              const col2 = item.secondaryColor || secondaryColor;

              // Truncate long labels
              const displayLabel =
                item.label.length > 12 ? `${item.label.slice(0, 10)}…` : item.label;

              return (
                <g key={`bar-group-${idx}`}>
                  {hasSecondary ? (
                    <>
                      {/* Primary Bar */}
                      <rect
                        x={centerX - singleBarW - 2}
                        y={y1}
                        width={singleBarW}
                        height={Math.max(1, h1)}
                        fill={col1}
                        rx="2"
                      >
                        <title>{`${item.label} (${primaryLabel}): ${v1}`}</title>
                      </rect>
                      {showValues && h1 > 14 && (
                        <text
                          x={centerX - singleBarW / 2 - 2}
                          y={y1 - 3}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="var(--color-text-secondary, #475569)"
                        >
                          {v1}
                        </text>
                      )}

                      {/* Secondary Bar */}
                      <rect
                        x={centerX + 2}
                        y={y2}
                        width={singleBarW}
                        height={Math.max(1, h2)}
                        fill={col2}
                        rx="2"
                      >
                        <title>{`${item.label} (${secondaryLabel}): ${v2}`}</title>
                      </rect>
                      {showValues && h2 > 14 && (
                        <text
                          x={centerX + singleBarW / 2 + 2}
                          y={y2 - 3}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="var(--color-text-secondary, #475569)"
                        >
                          {v2}
                        </text>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Single Bar */}
                      <rect
                        x={centerX - singleBarW / 2}
                        y={y1}
                        width={singleBarW}
                        height={Math.max(1, h1)}
                        fill={col1}
                        rx="3"
                      >
                        <title>{`${item.label}: ${v1}`}</title>
                      </rect>
                      {showValues && h1 > 14 && (
                        <text
                          x={centerX}
                          y={y1 - 4}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="var(--color-text-secondary, #475569)"
                        >
                          {v1}
                        </text>
                      )}
                    </>
                  )}

                  {/* X-Axis Category Label */}
                  <text
                    x={centerX}
                    y={padTop + plotH + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--color-text-secondary, #334155)"
                  >
                    {displayLabel}
                  </text>
                  {item.sublabel && (
                    <text
                      x={centerX}
                      y={padTop + plotH + 28}
                      textAnchor="middle"
                      fontSize="8"
                      fill="var(--color-text-muted, #64748b)"
                    >
                      {item.sublabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          {showLegend && hasSecondary && (
            <div className="chart-series-legend" role="list" aria-label="Bar Legend">
              <div className="series-legend-item" role="listitem">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: primaryColor }}
                  aria-hidden="true"
                />
                <span>{primaryLabel}</span>
              </div>
              <div className="series-legend-item" role="listitem">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: secondaryColor }}
                  aria-hidden="true"
                />
                <span>{secondaryLabel}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
