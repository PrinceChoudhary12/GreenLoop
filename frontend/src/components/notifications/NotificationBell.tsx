import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, CheckCheck, Truck, FileText, AlertCircle, BellOff } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { notificationService } from '../../services/notificationService';
import type { NotificationItem } from '../../types/notification';
import './NotificationBell.css';

const formatRelativeTime = (isoDate: string) => {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
};

export const NotificationBell: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await notificationService.fetchUnreadCount(token);
      setUnreadCount(res.unread_count);
    } catch {
      // ignore polling errors
    }
  }, [token, isAuthenticated]);

  const loadDropdownNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await notificationService.fetchNotifications(token, false, 0, 5);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load and 30-second interval polling
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      return;
    }

    loadUnreadCount();
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, loadUnreadCount]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadDropdownNotifications();
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!token) return;
    if (!item.is_read) {
      try {
        await notificationService.markAsRead(token, item.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
      } catch {
        // ignore
      }
    }
    setIsOpen(false);

    // Deep link navigation
    if (item.entity_type === 'pickup') {
      navigate('/pickups');
    } else if (item.entity_type === 'report' && item.entity_id) {
      navigate(`/reports/${item.entity_id}`);
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await notificationService.markAllAsRead(token);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const getNotificationIcon = (item: NotificationItem) => {
    if (item.type.startsWith('PICKUP_')) {
      return (
        <div className="notification-icon-wrap pickup">
          <Truck size={16} />
        </div>
      );
    }
    if (item.type.startsWith('REPORT_')) {
      return (
        <div className="notification-icon-wrap report">
          <FileText size={16} />
        </div>
      );
    }
    return (
      <div className="notification-icon-wrap alert">
        <AlertCircle size={16} />
      </div>
    );
  };

  if (!isAuthenticated) return null;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={toggleDropdown}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge" data-testid="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" data-testid="notification-dropdown">
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-title">
              Notifications
              {unreadCount > 0 && <span className="notification-unread-tag">{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button
                className="btn-mark-all-read"
                onClick={handleMarkAllRead}
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {loading ? (
              <div className="notification-dropdown-empty">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-dropdown-empty">
                <BellOff size={24} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  className={`notification-dropdown-item ${!item.is_read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') handleItemClick(item);
                  }}
                >
                  {getNotificationIcon(item)}
                  <div className="notification-content">
                    <div className="notification-item-title">{item.title}</div>
                    <div className="notification-item-msg">{item.message}</div>
                    <div className="notification-item-time">{formatRelativeTime(item.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <Link
              to="/notifications"
              className="view-all-link"
              onClick={() => setIsOpen(false)}
            >
              View all notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
