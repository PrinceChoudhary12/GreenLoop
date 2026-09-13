import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
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
    id: 1,
    user_id: 1,
    actor_id: 2,
    type: 'REPORT_CLAIMED',
    title: 'Report Claimed',
    message: 'Collector Marcus has claimed your waste report #10.',
    entity_type: 'report',
    entity_id: 10,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 1,
    actor_id: 2,
    type: 'PICKUP_COMPLETED',
    title: 'Pickup Completed',
    message: 'Your waste pickup #5 has been completed.',
    entity_type: 'pickup',
    entity_id: 5,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  },
];

describe('NotificationsPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders notifications list with items and filtering', async () => {
    vi.spyOn(notificationService, 'fetchNotifications').mockResolvedValue({
      items: mockNotifications,
      total: 2,
      unread_count: 1,
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
          <NotificationsPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Report Claimed')).toBeInTheDocument();
      expect(screen.getByText('Pickup Completed')).toBeInTheDocument();
      expect(screen.getByText(/Unread/i)).toBeInTheDocument();
    });
  });

  it('handles mark as read and mark all as read actions', async () => {
    vi.spyOn(notificationService, 'fetchNotifications').mockResolvedValue({
      items: mockNotifications,
      total: 2,
      unread_count: 2,
    });
    const markOneSpy = vi.spyOn(notificationService, 'markAsRead').mockResolvedValue({
      ...mockNotifications[0],
      is_read: true,
    });
    const markAllSpy = vi.spyOn(notificationService, 'markAllAsRead').mockResolvedValue({
      success: true,
      marked_count: 1,
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
          <NotificationsPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Report Claimed')).toBeInTheDocument();
    });

    const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
    await act(async () => {
      fireEvent.click(markReadButtons[0]);
    });
    expect(markOneSpy).toHaveBeenCalledWith('fake-jwt', 1);

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
    await act(async () => {
      fireEvent.click(markAllBtn);
    });
    expect(markAllSpy).toHaveBeenCalledWith('fake-jwt');
  });
});
