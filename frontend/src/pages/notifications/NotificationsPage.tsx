import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Truck,
  FileText,
  AlertCircle,
  BellOff,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { notificationService } from '../../services/notificationService';
import type { NotificationItem } from '../../types/notification';
import './NotificationsPage.css';

type CategoryFilter = 'ALL' | 'UNREAD' | 'PICKUPS' | 'REPORTS' | 'ALERTS';

export const NotificationsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.fetchNotifications(token, false, 0, 50);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);


  const handleMarkAsRead = async (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token || item.is_read) return;
    try {
      await notificationService.markAsRead(token, item.id);
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err?.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await notificationService.markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setActionFeedback(`Marked ${res.marked_count ?? 'all'} notifications as read.`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to mark all as read.');
    }
  };

  const handleCardClick = (item: NotificationItem) => {
    if (token && !item.is_read) {
      notificationService.markAsRead(token, item.id).catch(() => {});
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (item.entity_type === 'pickup') {
      navigate('/pickups');
    } else if (item.entity_type === 'report' && item.entity_id) {
      navigate(`/reports/${item.entity_id}`);
    } else if (item.entity_type === 'report') {
      navigate('/dashboard');
    }
  };

  const filteredNotifications = notifications.filter(item => {
    if (categoryFilter === 'UNREAD') return !item.is_read;
    if (categoryFilter === 'PICKUPS') return item.type.startsWith('PICKUP_') || item.entity_type === 'pickup';
    if (categoryFilter === 'REPORTS') return item.type.startsWith('REPORT_') || item.entity_type === 'report';
    if (categoryFilter === 'ALERTS') return !item.type.startsWith('PICKUP_') && !item.type.startsWith('REPORT_');
    return true;
  });

  const getNotificationIcon = (item: NotificationItem) => {
    if (item.type.startsWith('PICKUP_') || item.entity_type === 'pickup') {
      return (
        <div className="notification-card-icon pickup">
          <Truck size={20} />
        </div>
      );
    }
    if (item.type.startsWith('REPORT_') || item.entity_type === 'report') {
      return (
        <div className="notification-card-icon report">
          <FileText size={20} />
        </div>
      );
    }
    return (
      <div className="notification-card-icon alert">
        <AlertCircle size={20} />
      </div>
    );
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
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="notifications-title-area">
          <h1>Notifications Center</h1>
          <p>Stay updated on your waste reports, scheduled pickups, and platform alerts</p>
        </div>

        <div className="notifications-controls">
          <div className="filter-tab-group" role="tablist" aria-label="Notification Categories">
            <button
              className={`filter-tab-btn ${categoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ALL')}
              role="tab"
              aria-selected={categoryFilter === 'ALL'}
            >
              All
            </button>
            <button
              className={`filter-tab-btn ${categoryFilter === 'UNREAD' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('UNREAD')}
              role="tab"
              aria-selected={categoryFilter === 'UNREAD'}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              className={`filter-tab-btn ${categoryFilter === 'PICKUPS' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('PICKUPS')}
              role="tab"
              aria-selected={categoryFilter === 'PICKUPS'}
            >
              Pickups
            </button>
            <button
              className={`filter-tab-btn ${categoryFilter === 'REPORTS' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('REPORTS')}
              role="tab"
              aria-selected={categoryFilter === 'REPORTS'}
            >
              Reports
            </button>
            <button
              className={`filter-tab-btn ${categoryFilter === 'ALERTS' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ALERTS')}
              role="tab"
              aria-selected={categoryFilter === 'ALERTS'}
            >
              Alerts
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleMarkAllAsRead}
              aria-label="Mark all as read"
            >
              <CheckCheck size={16} style={{ marginRight: '6px' }} />
              Mark all read
            </button>
          )}

          <button
            className="btn btn-ghost btn-sm"
            onClick={loadNotifications}
            disabled={loading}
            aria-label="Refresh notifications"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }} role="status">
          {actionFeedback}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }} role="alert">
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadNotifications}
            style={{ marginLeft: '1rem', textDecoration: 'underline' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="notifications-empty-state">Loading your notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notifications-empty-state">
          <BellOff size={40} />
          <h3>No notifications found</h3>
          <p>
            {categoryFilter === 'UNREAD'
              ? 'You have no unread notifications.'
              : categoryFilter !== 'ALL'
              ? `No notifications in the ${categoryFilter.toLowerCase()} category.`
              : 'You will see updates here as your reports and pickups progress.'}
          </p>
        </div>
      ) : (
        <div className="notifications-list" role="list">
          {filteredNotifications.map(item => (
            <div
              key={item.id}
              className={`notification-card ${!item.is_read ? 'unread' : ''}`}
              onClick={() => handleCardClick(item)}
              role="listitem"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleCardClick(item);
              }}
              data-testid="notification-card"
            >
              {getNotificationIcon(item)}
              <div className="notification-card-body">
                <div className="notification-card-top">
                  <span className="notification-card-title">{item.title}</span>
                  <span className="notification-card-time">{formatDate(item.created_at)}</span>
                </div>
                <div className="notification-card-message">{item.message}</div>
                <div className="notification-card-actions">
                  {!item.is_read && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => handleMarkAsRead(item, e)}
                      aria-label="Mark as read"
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      <Check size={14} style={{ marginRight: '4px' }} />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
