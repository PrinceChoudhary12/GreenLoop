import React from 'react';
import type { ReportPriority } from '../../types/report';
import './PriorityBadge.css';

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

interface PriorityBadgeProps {
  priority: ReportPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  return (
    <span
      className={`priority-badge priority-${priority.toLowerCase()}`}
      aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
};
