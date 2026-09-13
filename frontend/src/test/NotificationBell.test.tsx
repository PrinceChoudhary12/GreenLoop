import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { AuthContext } from '../context/useAuth';
import { notificationService } from '../services/notificationService';
import type { User } from '../types/auth';
import type { NotificationItem } from '../types/notification';

const mockCitizenUser: User = {
  id: 1,
  name: 'Jane Citizen',
  email: 'jane@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockNotifications: NotificationItem[] = [
  {
    id: 101,
    user_id: 1,
    actor_id: 2,
    type: 'PICKUP_ASSIGNED',
    title: 'Collector Assigned',
    message: 'Marcus Collector has been assigned to your pickup #1.',
    entity_type: 'pickup',
    entity_id: 1,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  },
];

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders unread count badge and polls every 30 seconds', async () => {
    const unreadSpy = vi
      .spyOn(notificationService, 'fetchUnreadCount')
      .mockResolvedValueOnce({ unread_count: 3 })
      .mockResolvedValueOnce({ unread_count: 5 });

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCitizenUser,
            token: 'fake-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Initial unread fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('notification-badge')).toHaveTextContent('3');
    expect(unreadSpy).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(unreadSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('5');
  });

  it('opens dropdown, shows items, and marks notification as read', async () => {
    vi.spyOn(notificationService, 'fetchUnreadCount').mockResolvedValue({ unread_count: 1 });
    vi.spyOn(notificationService, 'fetchNotifications').mockResolvedValue({
      items: mockNotifications,
      total: 1,
      unread_count: 1,
    });
    const markSpy = vi.spyOn(notificationService, 'markAsRead').mockResolvedValue({
      ...mockNotifications[0],
      is_read: true,
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCitizenUser,
            token: 'fake-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <NotificationBell />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    await act(async () => {
      fireEvent.click(bellBtn);
      await Promise.resolve();
    });

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Collector Assigned')).toBeInTheDocument();

    const notifItem = screen.getByText('Collector Assigned');
    await act(async () => {
      fireEvent.click(notifItem);
      await Promise.resolve();
    });

    expect(markSpy).toHaveBeenCalledWith('fake-jwt', 101);
  });
});
