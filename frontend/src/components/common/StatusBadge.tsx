import React from 'react';
import type { HealthStatus } from '../../types/health';
import './StatusBadge.css';

interface StatusBadgeProps {
  status: HealthStatus | 'online' | 'connecting' | 'error';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'badge-success';
      case 'degraded':
      case 'connecting':
        return 'badge-warning';
      case 'unhealthy':
      case 'error':
      default:
        return 'badge-error';
    }
  };

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`status-badge ${getStatusClass()}`} role="status" aria-label={`Status: ${displayLabel}`}>
      <span className="status-dot" aria-hidden="true" />
      <span className="status-label">{displayLabel}</span>
    </span>
  );
};
