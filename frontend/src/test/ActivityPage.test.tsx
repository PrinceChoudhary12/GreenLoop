import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ActivityPage } from '../pages/activity/ActivityPage';
import { AuthContext } from '../context/useAuth';
import { activityService } from '../services/activityService';
import type { User } from '../types/auth';

const mockCitizen: User = {
  id: 1,
  name: 'Jane Citizen',
  email: 'jane@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
};

const mockActivityResponse = {
  items: [
    {
      id: 1,
      actor_id: 1,
      actor_name: 'Jane Citizen',
      actor_role: 'CITIZEN',
      target_user_id: null,
      target_user_name: null,
      action: 'REPORT_CREATED' as const,
      entity_type: 'report',
      entity_id: 10,
      details: 'Created waste report #10 for Plastic waste.',
      ip_address: null,
      created_at: '2026-09-29T10:00:00Z',
    },
    {
      id: 2,
      actor_id: 1,
      actor_name: 'Jane Citizen',
      actor_role: 'CITIZEN',
      target_user_id: null,
      target_user_name: null,
      action: 'PICKUP_REQUESTED' as const,
      entity_type: 'pickup',
      entity_id: 5,
      details: 'Scheduled pickup request #5 for 2026-10-01.',
      ip_address: null,
      created_at: '2026-09-29T11:00:00Z',
    },
  ],
  total: 2,
  skip: 0,
  limit: 50,
};

describe('ActivityPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and renders activity timeline events for citizen', async () => {
    const fetchSpy = vi
      .spyOn(activityService, 'fetchCitizenActivity')
      .mockResolvedValue(mockActivityResponse);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCitizen,
            token: 'test-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <ActivityPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Activity Audit Stream/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('test-token', 0, 50);
      expect(screen.getByText(/Created waste report #10 for Plastic waste/i)).toBeInTheDocument();
      expect(screen.getByText(/Scheduled pickup request #5 for 2026-10-01/i)).toBeInTheDocument();
    });
  });

  it('handles error state gracefully with retry button', async () => {
    vi.spyOn(activityService, 'fetchCitizenActivity').mockRejectedValue(
      new Error('Network error loading activity')
    );

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCitizen,
            token: 'test-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <ActivityPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load activity logs/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error loading activity/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
