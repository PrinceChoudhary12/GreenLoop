import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CollectorDashboard } from '../pages/collector/CollectorDashboard';
import { AuthContext } from '../context/useAuth';
import { collectorService } from '../services/collectorService';
import { pickupService } from '../services/pickupService';
import type { User } from '../types/auth';
import type { WasteReport } from '../types/report';

const mockCollectorUser: User = {
  id: 2,
  name: 'Marcus Vance',
  email: 'marcus@greenloop.local',
  role: 'COLLECTOR',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockAvailableReports: WasteReport[] = [
  {
    id: 101,
    user_id: 1,
    collector_id: null,
    category: 'PLASTIC',
    description: 'Bags of plastic bottles on 4th Ave',
    location: 'Corner of 4th Ave & Elm',
    status: 'SUBMITTED',
    priority: 'HIGH',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockAssignedReports: WasteReport[] = [
  {
    id: 102,
    user_id: 1,
    collector_id: 2,
    category: 'E_WASTE',
    description: 'Broken computer monitor by the curb',
    location: '742 Evergreen Terrace',
    status: 'UNDER_REVIEW',
    priority: 'MEDIUM',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('CollectorDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders collector metrics, available queue, and assigned workload', async () => {
    vi.spyOn(collectorService, 'getCollectorMe').mockResolvedValue({
      ...mockCollectorUser,
      metrics: {
        available_count: 1,
        assigned_count: 1,
        active_count: 1,
        resolved_count: 0,
      },
    });
    vi.spyOn(collectorService, 'getAvailableReports').mockResolvedValue(mockAvailableReports);
    vi.spyOn(collectorService, 'getAssignedReports').mockResolvedValue(mockAssignedReports);
    vi.spyOn(pickupService, 'getCollectorPickups').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockCollectorUser,
            token: 'fake-collector-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <CollectorDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading collector workspace.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Collector Workspace/i)).toBeInTheDocument();
      expect(screen.getByText(/Open in Queue/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Reports/i)).toBeInTheDocument();
      expect(screen.getByText(/Corner of 4th Ave & Elm/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Claim report #101/i })).toBeInTheDocument();
    });
  });
});
