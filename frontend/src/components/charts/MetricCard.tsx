import React from 'react';
import './charts.css';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  changeText?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  loading?: boolean;
  ariaLabel?: string;
  testId?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  changeText,
  changeType = 'neutral',
  icon,
  loading = false,
  ariaLabel,
  testId,
}) => {
  if (loading) {
    return (
      <article
        className="metric-card"
        aria-busy="true"
        aria-label={`Loading ${title}`}
        data-testid={testId ? `${testId}-loading` : 'metric-card-loading'}
      >
        <div className="metric-skeleton-title skeleton" />
        <div className="metric-skeleton-value skeleton" />
        <div className="metric-skeleton-sub skeleton" />
      </article>
    );
  }

  const badgeClass =
    changeType === 'positive'
      ? 'metric-badge metric-badge-positive'
      : changeType === 'negative'
      ? 'metric-badge metric-badge-negative'
      : 'metric-badge metric-badge-neutral';

  return (
    <article
      className="metric-card"
      aria-label={ariaLabel || `${title}: ${value}`}
      data-testid={testId || 'metric-card'}
    >
      <div className="metric-card-top">
        <h3 className="metric-card-title">{title}</h3>
        {icon && <div className="metric-card-icon" aria-hidden="true">{icon}</div>}
      </div>

      <div className="metric-card-value" aria-live="polite">
        {value}
      </div>

      {(subtitle || changeText) && (
        <div className="metric-card-footer">
          {subtitle && <span className="metric-card-subtitle">{subtitle}</span>}
          {changeText && <span className={badgeClass}>{changeText}</span>}
        </div>
      )}
    </article>
  );
};
