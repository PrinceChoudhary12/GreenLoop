import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, AlertCircle, Filter, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { activityService } from '../../services/activityService';
import { ActivityTimeline } from '../../components/activity/ActivityTimeline';
import type { ActivityLogItem } from '../../types/activity';
import './ActivityPage.css';

export const ActivityPage: React.FC = () => {
  const { token, user } = useAuth();
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const PAGE_LIMIT = 50;

  const loadActivities = useCallback(async (isLoadMore = false) => {
    if (!token || !user) return;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPageOffset(0);
    }
    setError(null);

    const currentOffset = isLoadMore ? pageOffset + PAGE_LIMIT : 0;

    try {
      let res;
      if (user.role === 'ADMIN') {
        const filters = {
          action: filterAction !== 'ALL' ? filterAction : undefined,
          entity_type: filterEntity !== 'ALL' ? filterEntity : undefined,
          skip: currentOffset,
          limit: PAGE_LIMIT,
        };
        res = await activityService.fetchAdminActivity(token, filters);
      } else if (user.role === 'COLLECTOR') {
        res = await activityService.fetchCollectorActivity(token, currentOffset, PAGE_LIMIT);
      } else {
        res = await activityService.fetchCitizenActivity(token, currentOffset, PAGE_LIMIT);
      }

      const newItems = res.items || [];
      if (isLoadMore) {
        setActivities(prev => [...prev, ...newItems]);
        setPageOffset(currentOffset);
      } else {
        setActivities(newItems);
      }

      setHasMore(newItems.length >= PAGE_LIMIT);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity stream.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, user, filterAction, filterEntity, pageOffset]);

  useEffect(() => {
    loadActivities(false);
  }, [loadActivities]);

  const displayedActivities = activities.filter(item => {
    if (user?.role === 'ADMIN') return true; // Server-side filtered for admin
    if (filterAction !== 'ALL' && item.action !== filterAction) return false;
    if (filterEntity !== 'ALL' && item.entity_type !== filterEntity) return false;
    return true;
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

          {/* Entity Type Filter */}
          <div className="activity-filter-wrap">
            <select
              className="activity-filter-select"
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
              aria-label="Filter activities by entity type"
            >
              <option value="ALL">All Entities</option>
              <option value="report">Reports</option>
              <option value="pickup">Pickups</option>
              <option value="user">Users</option>
            </select>
          </div>

          <button
            className="btn btn-ghost btn-sm activity-refresh-btn"
            onClick={() => loadActivities(false)}
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
          <button className="btn btn-ghost btn-sm" onClick={() => loadActivities(false)}>
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
                  : `${displayedActivities.length} Event${displayedActivities.length === 1 ? '' : 's'} Loaded`}
              </span>
            </div>
          </div>

          <div className="timeline-card-body">
            <ActivityTimeline
              activities={displayedActivities}
              loading={loading}
              emptyMessage={
                filterAction !== 'ALL' || filterEntity !== 'ALL'
                  ? 'No activity events match your active filters.'
                  : 'No activity events recorded yet. Perform actions across the platform to populate your activity log.'
              }
              showActor={user?.role === 'ADMIN'}
            />

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadActivities(true)}
                  disabled={loadingMore}
                  aria-label="Load more activity events"
                >
                  {loadingMore ? (
                    'Loading older logs...'
                  ) : (
                    <>
                      <span>Load More History</span>
                      <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
