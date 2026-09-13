import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Pickups } from '../pages/citizen/Pickups';
import { AuthContext } from '../context/useAuth';
import { pickupService } from '../services/pickupService';
import type { User } from '../types/auth';
import type { Pickup } from '../types/pickup';

const mockCitizenUser: User = {
  id: 1,
  name: 'Jane Citizen',
  email: 'jane@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockPickups: Pickup[] = [
  {
    id: 1,
    report_id: 101,
    user_id: 1,
    collector_id: 2,
    status: 'SCHEDULED',
    scheduled_date: '2026-09-15',
    time_slot: 'Morning (09:00 - 12:00)',
    notes: 'Please pick up near back gate',
    cancelled_at: null,
    cancelled_by_id: null,
    cancellation_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    report: {
      id: 101,
      category: 'PLASTIC',
      description: 'Bags of plastic bottles on 4th Ave',
      location: '123 Green Way',
      status: 'UNDER_REVIEW',
      priority: 'MEDIUM',
    },
    collector: {
      id: 2,
      name: 'Marcus Collector',
      email: 'marcus@greenloop.local',
    },
  },
];

describe('Pickups Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders citizen pickups list and pickup cards with status', async () => {
    vi.spyOn(pickupService, 'getCitizenPickups').mockResolvedValue(mockPickups);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCitizenUser,
            token: 'fake-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <Pickups />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading scheduled pickups/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Scheduled Waste Pickups/i)).toBeInTheDocument();
      expect(screen.getByText(/Pickup #1/i)).toBeInTheDocument();
      expect(screen.getByText(/123 Green Way/i)).toBeInTheDocument();
      expect(screen.getByText(/Marcus Collector/i)).toBeInTheDocument();
      expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel Request/i })).toBeInTheDocument();
    });
  });

  it('displays empty state when citizen has no pickups', async () => {
    vi.spyOn(pickupService, 'getCitizenPickups').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCitizenUser,
            token: 'fake-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <Pickups />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No pickup requests found/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Request Pickup from Reports/i })).toBeInTheDocument();
    });
  });
});
