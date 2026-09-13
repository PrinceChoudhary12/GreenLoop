import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Truck,
  FileText,
  AlertCircle,
  BellOff,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { notificationService } from '../../services/notificationService';
import type { NotificationItem } from '../../types/notification';
import './NotificationsPage.css';

export const NotificationsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.fetchNotifications(token, unreadOnly, 0, 50);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [token, unreadOnly]);

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
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await notificationService.markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleCardClick = (item: NotificationItem) => {
    if (token && !item.is_read) {
      notificationService.markAsRead(token, item.id).catch(() => {});
    }

    if (item.entity_type === 'pickup') {
      navigate('/pickups');
    } else if (item.entity_type === 'report' && item.entity_id) {
      navigate(`/reports/${item.entity_id}`);
    }
  };

  const getNotificationIcon = (item: NotificationItem) => {
    if (item.type.startsWith('PICKUP_')) {
      return (
        <div className="notification-card-icon pickup">
          <Truck size={20} />
        </div>
      );
    }
    if (item.type.startsWith('REPORT_')) {
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
          <h1>Notifications</h1>
          <p>Stay updated on your waste reports and scheduled pickups</p>
        </div>

        <div className="notifications-controls">
          <div className="filter-tab-group" role="tablist">
            <button
              className={`filter-tab-btn ${!unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(false)}
              role="tab"
              aria-selected={!unreadOnly}
            >
              All
            </button>
            <button
              className={`filter-tab-btn ${unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(true)}
              role="tab"
              aria-selected={unreadOnly}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
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
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="notifications-empty-state">Loading your notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty-state">
          <BellOff size={40} />
          <h3>No notifications found</h3>
          <p>
            {unreadOnly
              ? 'You have no unread notifications.'
              : 'You will see updates here as your reports and pickups progress.'}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(item => (
            <div
              key={item.id}
              className={`notification-card ${!item.is_read ? 'unread' : ''}`}
              onClick={() => handleCardClick(item)}
              role="button"
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
