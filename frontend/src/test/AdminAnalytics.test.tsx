import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminAnalytics } from '../pages/admin/AdminAnalytics';
import { AuthContext } from '../context/useAuth';
import { analyticsService } from '../services/analyticsService';
import type { User } from '../types/auth';
import type {
  AnalyticsOverviewResponse,
  CategoryAnalyticsResponse,
  CollectorPerformanceResponse,
  TrendAnalyticsResponse,
} from '../types/analytics';

const mockAdminUser: User = {
  id: 1,
  name: 'Super Admin',
  email: 'admin@greenloop.local',
  role: 'ADMIN',
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockOverview: AnalyticsOverviewResponse = {
  time_range: '30d',
  start_date: '2026-08-30T00:00:00Z',
  end_date: '2026-09-29T00:00:00Z',
  total_reports: 120,
  resolved_reports: 96,
  resolution_rate: 80.0,
  total_pickups: 60,
  completed_pickups: 54,
  pickup_completion_rate: 90.0,
  avg_resolution_turnaround_hours: 8.5,
  active_collectors: 6,
  active_citizens: 45,
};

const mockCategories: CategoryAnalyticsResponse = {
  time_range: '30d',
  total_reports: 120,
  categories: [
    {
      category: 'PLASTIC',
      label: 'Plastic Waste',
      report_count: 50,
      percentage: 41.7,
      resolved_count: 40,
      resolution_rate: 80.0,
    },
    {
      category: 'ORGANIC',
      label: 'Organic Waste',
      report_count: 70,
      percentage: 58.3,
      resolved_count: 56,
      resolution_rate: 80.0,
    },
  ],
};

const mockTrends: TrendAnalyticsResponse = {
  time_range: '30d',
  interval: 'day',
  data_points: [
    {
      timestamp: '2026-09-28T00:00:00Z',
      label: 'Sep 28',
      submitted_reports: 15,
      resolved_reports: 12,
      requested_pickups: 8,
      completed_pickups: 7,
    },
    {
      timestamp: '2026-09-29T00:00:00Z',
      label: 'Sep 29',
      submitted_reports: 20,
      resolved_reports: 18,
      requested_pickups: 10,
      completed_pickups: 9,
    },
  ],
};

const mockCollectors: CollectorPerformanceResponse = {
  time_range: '30d',
  collectors: [
    {
      collector_id: 101,
      name: 'David Collector',
      email: 'david@greenloop.local',
      is_active: true,
      assigned_reports: 25,
      resolved_reports: 22,
      assigned_pickups: 30,
      completed_pickups: 28,
      resolution_rate: 88.0,
      avg_completion_time_hours: 3.5,
    },
  ],
};

describe('AdminAnalytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: mockAdminUser,
            token: 'test-admin-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <AdminAnalytics />
        </AuthContext.Provider>
      </MemoryRouter>
    );

  it('renders all sections and loads analytics metrics', async () => {
    const getOverviewSpy = vi
      .spyOn(analyticsService, 'getAnalyticsOverview')
      .mockResolvedValue(mockOverview);
    const getCategoriesSpy = vi
      .spyOn(analyticsService, 'getCategoryAnalytics')
      .mockResolvedValue(mockCategories);
    const getTrendsSpy = vi
      .spyOn(analyticsService, 'getTrendAnalytics')
      .mockResolvedValue(mockTrends);
    const getCollectorsSpy = vi
      .spyOn(analyticsService, 'getCollectorPerformance')
      .mockResolvedValue(mockCollectors);

    renderComponent();

    expect(screen.getByRole('heading', { name: /Analytics & Reporting/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('test-admin-token', '30d');
      expect(getCategoriesSpy).toHaveBeenCalledWith('test-admin-token', '30d');
      expect(getTrendsSpy).toHaveBeenCalledWith('test-admin-token', '30d', 'day');
      expect(getCollectorsSpy).toHaveBeenCalledWith('test-admin-token', '30d');
    });

    // Verify KPI cards rendered
    expect(screen.getByTestId('kpi-total-reports')).toHaveTextContent('120');
    expect(screen.getByTestId('kpi-resolution-rate')).toHaveTextContent('80.0%');
    expect(screen.getByTestId('kpi-pickup-rate')).toHaveTextContent('90.0%');
    expect(screen.getByTestId('kpi-avg-turnaround')).toHaveTextContent('8.5 hrs');

    // Verify Category section rendered
    expect(screen.getAllByText('Plastic Waste').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Organic Waste').length).toBeGreaterThanOrEqual(1);

    // Verify Collector performance table rendered
    expect(screen.getByText('David Collector')).toBeInTheDocument();
    expect(screen.getByText('david@greenloop.local')).toBeInTheDocument();
  });

  it('handles time-range filter change', async () => {
    const getOverviewSpy = vi
      .spyOn(analyticsService, 'getAnalyticsOverview')
      .mockResolvedValue(mockOverview);
    vi.spyOn(analyticsService, 'getCategoryAnalytics').mockResolvedValue(mockCategories);
    vi.spyOn(analyticsService, 'getTrendAnalytics').mockResolvedValue(mockTrends);
    vi.spyOn(analyticsService, 'getCollectorPerformance').mockResolvedValue(mockCollectors);

    renderComponent();

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('test-admin-token', '30d');
    });

    const btn7d = screen.getByTestId('filter-timerange-7d');
    fireEvent.click(btn7d);

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('test-admin-token', '7d');
    });
  });

  it('handles trend interval filter change', async () => {
    vi.spyOn(analyticsService, 'getAnalyticsOverview').mockResolvedValue(mockOverview);
    vi.spyOn(analyticsService, 'getCategoryAnalytics').mockResolvedValue(mockCategories);
    const getTrendsSpy = vi
      .spyOn(analyticsService, 'getTrendAnalytics')
      .mockResolvedValue(mockTrends);
    vi.spyOn(analyticsService, 'getCollectorPerformance').mockResolvedValue(mockCollectors);

    renderComponent();

    await waitFor(() => {
      expect(getTrendsSpy).toHaveBeenCalledWith('test-admin-token', '30d', 'day');
    });

    const btnWeek = screen.getByTestId('filter-interval-week');
    fireEvent.click(btnWeek);

    await waitFor(() => {
      expect(getTrendsSpy).toHaveBeenCalledWith('test-admin-token', '30d', 'week');
    });
  });

  it('displays error state with retry button if an API fails', async () => {
    vi.spyOn(analyticsService, 'getAnalyticsOverview').mockRejectedValue(
      new Error('Failed to fetch KPI overview')
    );
    vi.spyOn(analyticsService, 'getCategoryAnalytics').mockResolvedValue(mockCategories);
    vi.spyOn(analyticsService, 'getTrendAnalytics').mockResolvedValue(mockTrends);
    vi.spyOn(analyticsService, 'getCollectorPerformance').mockResolvedValue(mockCollectors);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch KPI overview')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Overview/i })).toBeInTheDocument();
    });
  });
});
