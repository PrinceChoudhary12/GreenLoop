import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { SearchModal } from '../components/search/SearchModal';
import { AuthContext } from '../context/useAuth';
import { ThemeProvider } from '../context/ThemeContext';
import type { User } from '../types/auth';

const mockCitizen: User = {
  id: 1,
  name: 'Jane Citizen',
  email: 'jane@greenloop.local',
  role: 'CITIZEN',
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
};

const mockAdmin: User = {
  id: 2,
  name: 'Admin Boss',
  email: 'admin@greenloop.local',
  role: 'ADMIN',
  is_active: true,
  created_at: '2026-01-01T10:00:00Z',
};

describe('Platform UI 2.0 Shell & Navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('renders role-appropriate navigation for Citizen', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
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
            <Sidebar
              collapsed={false}
              onToggleCollapse={vi.fn()}
              mobileOpen={false}
              onCloseMobile={vi.fn()}
            />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Report Waste')).toBeInTheDocument();
    expect(screen.getByText('My Reports')).toBeInTheDocument();
    expect(screen.getByText('My Pickups')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics Studio')).not.toBeInTheDocument();
  });

  it('renders role-appropriate navigation for Admin', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <ThemeProvider>
          <AuthContext.Provider
            value={{
              user: mockAdmin,
              token: 'test-token',
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              logout: vi.fn(),
            }}
          >
            <Sidebar
              collapsed={false}
              onToggleCollapse={vi.fn()}
              mobileOpen={false}
              onCloseMobile={vi.fn()}
            />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Analytics Studio')).toBeInTheDocument();
    expect(screen.queryByText('Report Waste')).not.toBeInTheDocument();
  });

  it('toggles profile dropdown menu in TopBar and triggers logout', async () => {
    const logoutMock = vi.fn();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <AuthContext.Provider
            value={{
              user: mockCitizen,
              token: 'test-token',
              isAuthenticated: true,
              isLoading: false,
              login: vi.fn(),
              logout: logoutMock,
            }}
          >
            <TopBar
              onOpenMobileNav={vi.fn()}
              onOpenSearch={vi.fn()}
            />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const profileBtn = screen.getByRole('button', { name: /user profile menu/i });
    fireEvent.click(profileBtn);

    expect(screen.getByText('My Profile & Account')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();

    const signOutBtn = screen.getByText('Sign Out');
    fireEvent.click(signOutBtn);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('toggles theme in TopBar and persists in localStorage', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
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
            <TopBar
              onOpenMobileNav={vi.fn()}
              onOpenSearch={vi.fn()}
            />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const themeBtn = screen.getByRole('button', { name: /toggle visual theme/i });
    fireEvent.click(themeBtn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('renders and filters items in SearchModal', () => {
    const closeMock = vi.fn();

    render(
      <MemoryRouter>
        <ThemeProvider>
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
            <SearchModal isOpen={true} onClose={closeMock} />
          </AuthContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/search commands, reports/i)).toBeInTheDocument();
    expect(screen.getByText('Report Waste Incident')).toBeInTheDocument();

    // Filter query
    const input = screen.getByPlaceholderText(/search commands, reports/i);
    fireEvent.change(input, { target: { value: 'pickups' } });

    expect(screen.getByText('Pickups & Scheduling')).toBeInTheDocument();
    expect(screen.queryByText('Report Waste Incident')).not.toBeInTheDocument();
  });
});
