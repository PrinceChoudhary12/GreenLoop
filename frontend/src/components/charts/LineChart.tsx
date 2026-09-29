import React from 'react';
import './charts.css';

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  strokeDasharray?: string;
}

export interface LineChartProps {
  title?: string;
  subtitle?: string;
  data: Array<{ label: string; [key: string]: any }>;
  series: LineSeries[];
  emptyText?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  ariaLabel?: string;
  testId?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  title,
  subtitle,
  data = [],
  series = [],
  emptyText = 'No timeline trend data available',
  showLegend = true,
  showGrid = true,
  ariaLabel,
  testId = 'line-chart',
}) => {
  const chartW = 600;
  const chartH = 260;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;

  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  // Calculate highest data value across all series
  const rawMax = React.useMemo(() => {
    let max = 0;
    for (const d of data) {
      for (const s of series) {
        const val = Number(d[s.key]);
        if (Number.isFinite(val) && val > max) {
          max = val;
        }
      }
    }
    return max;
  }, [data, series]);

  // Generate a nice Y-axis upper bound with 4 intervals
  const yTicks = React.useMemo(() => {
    const targetMax = rawMax > 0 ? rawMax : 4;
    const step = Math.max(1, Math.ceil(targetMax / 4));
    const niceMax = step * 4;
    return [0, step, step * 2, step * 3, niceMax];
  }, [rawMax]);

  const yMax = yTicks[yTicks.length - 1];

  const getX = (index: number, total: number) => {
    if (total <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (total - 1)) * plotW;
  };

  const getY = (val: number) => {
    const safeVal = Number.isFinite(val) && val >= 0 ? val : 0;
    return padTop + plotH - (safeVal / yMax) * plotH;
  };

  // Generate SVG path for a given series
  const generatePath = (s: LineSeries) => {
    if (data.length === 0) return '';
    return data
      .map((d, i) => {
        const val = Number(d[s.key]) || 0;
        const x = getX(i, data.length);
        const y = getY(val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Skip x-axis labels if there are too many data points
  const labelInterval = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  const chartTitle = title || 'Timeline Trend Chart';
  const accessibleDescription =
    data.length > 0
      ? `Line chart with ${series.length} series across ${data.length} chronological points.`
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

      {data.length === 0 || series.length === 0 ? (
        <div className="chart-empty-state" data-testid={`${testId}-empty`}>
          <span className="chart-empty-icon" aria-hidden="true">📈</span>
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

            {/* Grid Lines and Y-Axis Ticks */}
            {showGrid &&
              yTicks.map((tickVal, idx) => {
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

            {/* X-Axis Baseline */}
            <line
              x1={padLeft}
              y1={padTop + plotH}
              x2={padLeft + plotW}
              y2={padTop + plotH}
              stroke="var(--color-border-subtle, #cbd5e1)"
              strokeWidth="1.5"
            />

            {/* X-Axis Labels */}
            {data.map((d, i) => {
              if (i % labelInterval !== 0 && i !== data.length - 1) return null;
              const x = getX(i, data.length);
              return (
                <text
                  key={`xlabel-${i}`}
                  x={x}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-text-muted, #64748b)"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Line Series Paths and Point Dots */}
            {series.map((s) => {
              const pathStr = generatePath(s);
              return (
                <g key={`series-${s.key}`}>
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    strokeDasharray={s.strokeDasharray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {data.map((d, i) => {
                    const val = Number(d[s.key]) || 0;
                    const cx = getX(i, data.length);
                    const cy = getY(val);
                    return (
                      <circle
                        key={`pt-${s.key}-${i}`}
                        cx={cx}
                        cy={cy}
                        r="3"
                        fill={s.color}
                        stroke="var(--color-surface-card, #ffffff)"
                        strokeWidth="1.5"
                      >
                        <title>{`${s.name} (${d.label}): ${val}`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Series Legend */}
          {showLegend && (
            <div className="chart-series-legend" role="list" aria-label="Series Legend">
              {series.map((s) => (
                <div key={`legend-${s.key}`} className="series-legend-item" role="listitem">
                  <span
                    className="series-legend-line"
                    style={{ backgroundColor: s.color }}
                    aria-hidden="true"
                  />
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
