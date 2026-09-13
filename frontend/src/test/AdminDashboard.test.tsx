import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AuthContext } from '../context/useAuth';
import { adminService } from '../services/adminService';
import type { AdminMetrics, AdminReport, AdminUser, CollectorLookupItem } from '../types/admin';
import type { User } from '../types/auth';

const mockAdminUser: User = {
  id: 99,
  name: 'Chief Admin',
  email: 'chief.admin@greenloop.local',
  role: 'ADMIN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockMetrics: AdminMetrics = {
  total_users: 12,
  total_citizens: 8,
  total_collectors: 3,
  active_users: 11,
  deactivated_users: 1,
  total_reports: 25,
  submitted_reports: 5,
  active_reports: 8,
  resolved_reports: 10,
  rejected_reports: 2,
};

const mockUsers: AdminUser[] = [
  {
    id: 1,
    name: 'Alice Citizen',
    email: 'alice@example.com',
    role: 'CITIZEN',
    is_active: true,
    created_at: new Date().toISOString(),
    reports_count: 4,
    assigned_reports_count: 0,
  },
  {
    id: 2,
    name: 'Bob Collector',
    email: 'bob@example.com',
    role: 'COLLECTOR',
    is_active: true,
    created_at: new Date().toISOString(),
    reports_count: 0,
    assigned_reports_count: 5,
  },
];

const mockReports: AdminReport[] = [
  {
    id: 201,
    user_id: 1,
    user_name: 'Alice Citizen',
    user_email: 'alice@example.com',
    collector_id: null,
    collector_name: null,
    collector_email: null,
    category: 'PLASTIC',
    description: 'Bulk plastic accumulation near community garden',
    location: 'Garden Lot 4B',
    status: 'SUBMITTED',
    priority: 'HIGH',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockCollectors: CollectorLookupItem[] = [
  {
    id: 2,
    name: 'Bob Collector',
    email: 'bob@example.com',
    is_active: true,
    active_tasks_count: 2,
  },
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders systemwide administrative metrics and user management table', async () => {
    vi.spyOn(adminService, 'getMetrics').mockResolvedValue(mockMetrics);
    vi.spyOn(adminService, 'getUsers').mockResolvedValue(mockUsers);
    vi.spyOn(adminService, 'getReports').mockResolvedValue(mockReports);
    vi.spyOn(adminService, 'getCollectors').mockResolvedValue(mockCollectors);

    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockAdminUser,
            token: 'fake-admin-jwt',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <AdminDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/System Administration/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Users/i)).toBeInTheDocument();
      expect(screen.getByText(/Alice Citizen/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob Collector/i)).toBeInTheDocument();
      expect(screen.getByText(/User Directory/i)).toBeInTheDocument();
      expect(screen.getByText(/Platform Waste Reports/i)).toBeInTheDocument();
    });
  });
});
