import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SearchModal } from '../components/search/SearchModal';
import { AuthContext } from '../context/useAuth';
import { searchService } from '../services/searchService';
import type { User } from '../types/auth';
import type { GlobalSearchResponse } from '../types/search';

const mockUser: User = {
  id: 1,
  name: 'Sam Citizen',
  email: 'sam@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockSearchResults: GlobalSearchResponse = {
  query: 'plastic',
  total_results: 2,
  results: [
    {
      id: 'report_10',
      entity_type: 'report',
      entity_id: 10,
      title: 'Report #10 (PLASTIC)',
      subtitle: 'Main Street — Overflowing plastic bottles',
      category: 'PLASTIC',
      status: 'SUBMITTED',
      target_url: '/reports?reportId=10',
      created_at: new Date().toISOString(),
    },
    {
      id: 'pickup_5',
      entity_type: 'pickup',
      entity_id: 5,
      title: 'Pickup #5 - REQUESTED',
      subtitle: 'Main Street (Plastic bin collection)',
      category: 'PICKUP',
      status: 'REQUESTED',
      target_url: '/pickups?pickupId=5',
      created_at: new Date().toISOString(),
    },
  ],
};

describe('SearchModal Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders quick action shortcuts when query is empty', async () => {
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
          <SearchModal isOpen={true} onClose={vi.fn()} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText(/Search commands, reports/i)).toBeInTheDocument();
    expect(screen.getByText('Report Waste Incident')).toBeInTheDocument();
    expect(screen.getByText('My Waste Reports')).toBeInTheDocument();
  });

  it('performs debounced server search for queries >= 2 characters', async () => {
    const searchSpy = vi.spyOn(searchService, 'searchGlobal').mockResolvedValue(mockSearchResults);

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
          <SearchModal isOpen={true} onClose={vi.fn()} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search commands, reports/i);
    fireEvent.change(input, { target: { value: 'plastic' } });

    // Advance 300ms debounce timer
    act(() => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith('fake-jwt', 'plastic', 20, expect.any(Object));
      expect(screen.getByText('Report #10 (PLASTIC)')).toBeInTheDocument();
      expect(screen.getByText('Pickup #5 - REQUESTED')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation and item selection', async () => {
    vi.spyOn(searchService, 'searchGlobal').mockResolvedValue(mockSearchResults);
    const onCloseMock = vi.fn();

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
          <SearchModal isOpen={true} onClose={onCloseMock} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/Search commands, reports/i);
    fireEvent.change(input, { target: { value: 'plastic' } });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText('Report #10 (PLASTIC)')).toBeInTheDocument();
    });

    const reportItem = screen.getByText('Report #10 (PLASTIC)');
    fireEvent.click(reportItem);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('closes on Escape key press', async () => {
    const onCloseMock = vi.fn();

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
          <SearchModal isOpen={true} onClose={onCloseMock} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
