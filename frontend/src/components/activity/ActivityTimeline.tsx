import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  PlayCircle,
  UserCheck,
  UserX,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import type { ActivityAction, ActivityLogItem } from '../../types/activity';
import './ActivityTimeline.css';

interface ActivityTimelineProps {
  activities: ActivityLogItem[];
  loading?: boolean;
  emptyMessage?: string;
  showActor?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading = false,
  emptyMessage = 'No activity recorded yet.',
  showActor = true,
}) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="activity-timeline-empty">Loading activity history...</div>;
  }

  if (!activities || activities.length === 0) {
    return <div className="activity-timeline-empty">{emptyMessage}</div>;
  }

  const handleEntityClick = (entityType?: string, entityId?: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!entityType) return;
    const typeLower = entityType.toLowerCase();
    if (typeLower === 'pickup') {
      navigate('/pickups');
    } else if (typeLower === 'report' && entityId) {
      navigate(`/reports/${entityId}`);
    } else if (typeLower === 'report') {
      navigate('/dashboard');
    }
  };

  const getActionIcon = (action: ActivityAction) => {
    switch (action) {
      case 'REPORT_CREATED':
        return (
          <div className="activity-dot-icon report">
            <FileText size={16} />
          </div>
        );
      case 'REPORT_CLAIMED':
      case 'REPORT_STATUS_UPDATED':
        return (
          <div className="activity-dot-icon report">
            <CheckCircle2 size={16} />
          </div>
        );
      case 'PICKUP_REQUESTED':
      case 'PICKUP_SCHEDULED':
      case 'PICKUP_ASSIGNED':
      case 'PICKUP_ACCEPTED':
        return (
          <div className="activity-dot-icon pickup">
            <Truck size={16} />
          </div>
        );
      case 'PICKUP_IN_PROGRESS':
        return (
          <div className="activity-dot-icon pickup">
            <PlayCircle size={16} />
          </div>
        );
      case 'PICKUP_COMPLETED':
        return (
          <div className="activity-dot-icon pickup">
            <CheckCircle2 size={16} />
          </div>
        );
      case 'PICKUP_CANCELLED':
        return (
          <div className="activity-dot-icon cancelled">
            <XCircle size={16} />
          </div>
        );
      case 'USER_ACTIVATED':
        return (
          <div className="activity-dot-icon user">
            <UserCheck size={16} />
          </div>
        );
      case 'USER_DEACTIVATED':
        return (
          <div className="activity-dot-icon cancelled">
            <UserX size={16} />
          </div>
        );
      default:
        return (
          <div className="activity-dot-icon">
            <Clock size={16} />
          </div>
        );
    }
  };

  const formatActionTitle = (action: ActivityAction): string => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="activity-timeline" role="feed" aria-label="Activity timeline stream">
      <div className="timeline-items-wrapper">
        {activities.map(item => (
          <div key={item.id} className="activity-timeline-item" data-testid="activity-item">
            {getActionIcon(item.action)}
            <div className="activity-card">
              <div className="activity-card-header">
                <div className="activity-action-title">
                  <span>{formatActionTitle(item.action)}</span>
                  {item.entity_type && (
                    <button
                      className="activity-entity-tag"
                      onClick={e => handleEntityClick(item.entity_type, item.entity_id, e)}
                      title={`Navigate to ${item.entity_type} #${item.entity_id || ''}`}
                      type="button"
                    >
                      {item.entity_type} {item.entity_id ? `#${item.entity_id}` : ''}
                    </button>
                  )}
                </div>
                <span className="activity-timestamp">{formatDate(item.created_at)}</span>
              </div>

              {item.details && <div className="activity-details">{item.details}</div>}

              <div className="activity-meta">
                {showActor && item.actor_name && (
                  <span className="activity-actor-badge">
                    <UserIcon size={12} />
                    <span>
                      {item.actor_name}
                      {item.actor_role && ` (${item.actor_role})`}
                    </span>
                  </span>
                )}
                {item.target_user_name && item.target_user_name !== item.actor_name && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Target: <strong>{item.target_user_name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
