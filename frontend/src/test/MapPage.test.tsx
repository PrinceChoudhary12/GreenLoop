import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MapPage } from '../pages/map/MapPage';
import { AuthContext } from '../context/useAuth';
import { locationService } from '../services/locationService';
import type { User } from '../types/auth';
import type { MapDataResponse } from '../types/location';

const mockUser: User = {
  id: 1,
  name: 'Alex Citizen',
  email: 'alex@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockMapData: MapDataResponse = {
  points: [
    {
      id: 'report-10',
      point_type: 'report',
      entity_id: 10,
      title: 'Overflowing Plastic Bin',
      description: 'Bin near market center is full.',
      latitude: 37.7749,
      longitude: -122.4194,
      status: 'OPEN',
      updated_at: new Date().toISOString(),
      is_live: false,
      is_stale: false,
    },
    {
      id: 'pickup-5',
      point_type: 'pickup',
      entity_id: 5,
      title: 'Bulk Metal Pickup',
      description: 'Scheduled residential pickup.',
      latitude: 37.7833,
      longitude: -122.4167,
      status: 'SCHEDULED',
      updated_at: new Date().toISOString(),
      is_live: false,
      is_stale: false,
    },
    {
      id: 'collector-2',
      point_type: 'collector',
      entity_id: 2,
      title: 'Collector Marcus',
      description: 'Active truck on route B.',
      latitude: 37.775,
      longitude: -122.418,
      status: 'DISPATCHED',
      updated_at: new Date().toISOString(),
      is_live: true,
      is_stale: true,
    },
  ],
  total_points: 3,
  user_location: {
    user_id: 1,
    latitude: 37.7749,
    longitude: -122.4194,
    is_sharing_active: true,
    updated_at: new Date().toISOString(),
    is_stale: false,
  },
};

describe('MapPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders live geospatial map with markers and summary filters', async () => {
    vi.spyOn(locationService, 'fetchMapData').mockResolvedValue(mockMapData);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockUser,
            token: 'fake-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
          }}
        >
          <MapPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Live Geospatial & Dispatch Map')).toBeInTheDocument();
      expect(screen.getByText('All (3)')).toBeInTheDocument();
      expect(screen.getByText('Reports (1)')).toBeInTheDocument();
      expect(screen.getByText('Pickups (1)')).toBeInTheDocument();
      expect(screen.getByText('Collectors (1)')).toBeInTheDocument();
    });
  });

  it('filters map markers when filter chips are clicked', async () => {
    vi.spyOn(locationService, 'fetchMapData').mockResolvedValue(mockMapData);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockUser,
            token: 'fake-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
          }}
        >
          <MapPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('All (3)')).toBeInTheDocument();
    });

    const reportFilterBtn = screen.getByRole('button', { name: /Reports \(1\)/i });
    fireEvent.click(reportFilterBtn);

    expect(reportFilterBtn).toHaveClass('active');
  });

  it('toggles location sharing consent with server update', async () => {
    vi.spyOn(locationService, 'fetchMapData').mockResolvedValue(mockMapData);
    const toggleConsentSpy = vi.spyOn(locationService, 'toggleLocationConsent').mockResolvedValue({
      user_id: 1,
      latitude: null,
      longitude: null,
      is_sharing_active: false,
      updated_at: new Date().toISOString(),
      is_stale: false,
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockUser,
            token: 'fake-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
          }}
        >
          <MapPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sharing Enabled')).toBeInTheDocument();
    });

    const consentBtn = screen.getByRole('button', { name: /Sharing Enabled/i });
    await act(async () => {
      fireEvent.click(consentBtn);
    });

    expect(toggleConsentSpy).toHaveBeenCalledWith('fake-jwt', false);
    await waitFor(() => {
      expect(screen.getByText('Sharing Disabled')).toBeInTheDocument();
    });
  });

  it('displays error notice on network failure with retry button', async () => {
    const fetchSpy = vi
      .spyOn(locationService, 'fetchMapData')
      .mockRejectedValueOnce(new Error('Network error loading map'))
      .mockResolvedValueOnce(mockMapData);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockUser,
            token: 'fake-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            updateUser: vi.fn(),
          }}
        >
          <MapPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Map Data')).toBeInTheDocument();
      expect(screen.getByText('Network error loading map')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Live Geospatial & Dispatch Map')).toBeInTheDocument();
    });
  });
});
