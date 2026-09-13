import type {
  NotificationCountResponse,
  NotificationItem,
  NotificationListResponse,
} from '../types/notification';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  if (!response.ok) {
    let errorMsg = defaultErrorMsg;
    try {
      const data = await response.json();
      if (data?.error?.message) {
        errorMsg = data.error.message;
      } else if (data?.message) {
        errorMsg = data.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const notificationService = {
  async fetchNotifications(
    token: string,
    unreadOnly = false,
    skip = 0,
    limit = 50,
  ): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      unread_only: unreadOnly ? 'true' : 'false',
      skip: String(skip),
      limit: String(limit),
    });

    const response = await fetch(`${API_BASE}/api/v1/notifications?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<NotificationListResponse>(response, 'Failed to fetch notifications.');
  },

  async fetchUnreadCount(token: string): Promise<NotificationCountResponse> {
    const response = await fetch(`${API_BASE}/api/v1/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<NotificationCountResponse>(response, 'Failed to fetch unread notification count.');
  },

  async markAsRead(token: string, notificationId: number): Promise<NotificationItem> {
    const response = await fetch(`${API_BASE}/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<NotificationItem>(response, 'Failed to mark notification as read.');
  },

  async markAllAsRead(token: string): Promise<{ success: boolean; marked_count: number }> {
    const response = await fetch(`${API_BASE}/api/v1/notifications/mark-all-read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return handleResponse<{ success: boolean; marked_count: number }>(
      response,
      'Failed to mark all notifications as read.',
    );
  },
};
