import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, AlertCircle, Filter, Calendar } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { activityService } from '../../services/activityService';
import { ActivityTimeline } from '../../components/activity/ActivityTimeline';
import type { ActivityLogItem } from '../../types/activity';
import './ActivityPage.css';

export const ActivityPage: React.FC = () => {
  const { token, user } = useAuth();
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const loadActivities = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);

    try {
      let res;
      if (user.role === 'ADMIN') {
        const filters = filterAction !== 'ALL' ? { action: filterAction } : undefined;
        res = await activityService.fetchAdminActivity(token, filters);
      } else if (user.role === 'COLLECTOR') {
        res = await activityService.fetchCollectorActivity(token);
      } else {
        res = await activityService.fetchCitizenActivity(token);
      }
      setActivities(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity stream.');
    } finally {
      setLoading(false);
    }
  }, [token, user, filterAction]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Client-side filter for citizen & collector if needed
  const displayedActivities = activities.filter(item => {
    if (filterAction === 'ALL') return true;
    return item.action === filterAction;
  });

  return (
    <div className="activity-page-container">
      {/* Header Section */}
      <div className="activity-page-header">
        <div className="activity-header-left">
          <div className="activity-title-wrap">
            <div className="activity-icon-badge">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="activity-page-title">Activity Audit Stream</h1>
              <p className="activity-page-subtitle">
                {user?.role === 'ADMIN'
                  ? 'Complete platform-wide administrative and operational audit trail.'
                  : user?.role === 'COLLECTOR'
                  ? 'Your operational logs, claimed reports, and pickup collection events.'
                  : 'Track all status updates, submitted reports, and scheduled pickups.'}
              </p>
            </div>
          </div>
        </div>

        <div className="activity-header-actions">
          {/* Action Filter */}
          <div className="activity-filter-wrap">
            <Filter size={15} className="filter-icon" />
            <select
              className="activity-filter-select"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              aria-label="Filter activities by action"
            >
              <option value="ALL">All Actions ({activities.length})</option>
              <option value="REPORT_CREATED">Report Created</option>
              <option value="REPORT_STATUS_UPDATED">Report Status Updated</option>
              <option value="PICKUP_REQUESTED">Pickup Requested</option>
              <option value="PICKUP_ASSIGNED">Pickup Assigned</option>
              <option value="PICKUP_COMPLETED">Pickup Completed</option>
              <option value="PICKUP_CANCELLED">Pickup Cancelled</option>
            </select>
          </div>

          <button
            className="btn btn-ghost btn-sm activity-refresh-btn"
            onClick={loadActivities}
            disabled={loading}
            aria-label="Refresh activity feed"
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="activity-error-card" role="alert">
          <AlertCircle size={20} />
          <div className="error-text">
            <strong>Unable to load activity logs</strong>
            <p>{error}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadActivities}>
            Try Again
          </button>
        </div>
      )}

      {!error && (
        <div className="activity-timeline-card">
          <div className="timeline-card-header">
            <div className="timeline-count-badge">
              <Calendar size={14} />
              <span>
                {loading
                  ? 'Loading events...'
                  : `${displayedActivities.length} Event${displayedActivities.length === 1 ? '' : 's'} Recorded`}
              </span>
            </div>
          </div>

          <div className="timeline-card-body">
            <ActivityTimeline
              activities={displayedActivities}
              loading={loading}
              emptyMessage={
                filterAction !== 'ALL'
                  ? `No activity events matching "${filterAction.replace(/_/g, ' ')}".`
                  : 'No activity events recorded yet. Perform actions across the platform to populate your activity log.'
              }
              showActor={user?.role === 'ADMIN'}
            />
          </div>
        </div>
      )}
    </div>
  );
};
