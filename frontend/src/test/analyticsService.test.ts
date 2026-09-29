import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyticsService,
  getAnalyticsOverview,
  getCategoryAnalytics,
  getTrendAnalytics,
  getCollectorPerformance,
} from '../services/analyticsService';

describe('analyticsService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches overview analytics with correct endpoint and params', async () => {
    const mockOverview = {
      time_range: '30d',
      start_date: '2026-08-30T00:00:00Z',
      end_date: '2026-09-29T00:00:00Z',
      total_reports: 100,
      resolved_reports: 80,
      resolution_rate: 80.0,
      total_pickups: 50,
      completed_pickups: 45,
      pickup_completion_rate: 90.0,
      avg_resolution_turnaround_hours: 12.5,
      active_collectors: 5,
      active_citizens: 40,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOverview,
    });
    globalThis.fetch = fetchMock;

    const data = await getAnalyticsOverview('test-token', '7d');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/analytics/overview?time_range=7d');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.total_reports).toBe(100);
    expect(data.resolution_rate).toBe(80.0);
  });

  it('fetches category analytics with correct endpoint and params', async () => {
    const mockCategories = {
      time_range: '30d',
      total_reports: 50,
      categories: [
        {
          category: 'PLASTIC',
          label: 'Plastic Waste',
          report_count: 20,
          percentage: 40.0,
          resolved_count: 15,
          resolution_rate: 75.0,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCategories,
    });
    globalThis.fetch = fetchMock;

    const data = await getCategoryAnalytics('test-token', '30d');
    expect(analyticsService.getCategoryAnalytics).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/analytics/categories?time_range=30d');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].category).toBe('PLASTIC');
  });

  it('fetches trend analytics with correct endpoint and interval', async () => {
    const mockTrends = {
      time_range: '90d',
      interval: 'week',
      data_points: [
        {
          timestamp: '2026-09-01T00:00:00Z',
          label: 'Sep 01',
          submitted_reports: 10,
          resolved_reports: 8,
          requested_pickups: 5,
          completed_pickups: 5,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTrends,
    });
    globalThis.fetch = fetchMock;

    const data = await getTrendAnalytics('test-token', '90d', 'week');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/analytics/trends?time_range=90d&interval=week');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.data_points).toHaveLength(1);
    expect(data.interval).toBe('week');
  });

  it('fetches collector performance with correct endpoint', async () => {
    const mockCollectors = {
      time_range: 'all',
      collectors: [
        {
          collector_id: 10,
          name: 'Bob Collector',
          email: 'bob@example.com',
          is_active: true,
          assigned_reports: 15,
          resolved_reports: 12,
          assigned_pickups: 20,
          completed_pickups: 18,
          resolution_rate: 80.0,
          avg_completion_time_hours: 4.2,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCollectors,
    });
    globalThis.fetch = fetchMock;

    const data = await getCollectorPerformance('test-token', 'all');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/analytics/collectors-performance?time_range=all');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(data.collectors).toHaveLength(1);
    expect(data.collectors[0].name).toBe('Bob Collector');
  });

  it('uses default time_range and interval parameters when omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        time_range: '30d',
        interval: 'day',
        data_points: [],
      }),
    });
    globalThis.fetch = fetchMock;

    await getTrendAnalytics('test-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('time_range=30d');
    expect(url).toContain('interval=day');
  });

  it('handles API error responses with detail strings and objects', async () => {
    // 1. message property
    let fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Not authenticated' }),
    });
    globalThis.fetch = fetchMock;
    await expect(getAnalyticsOverview('invalid-token')).rejects.toThrow('Not authenticated');

    // 2. detail string property
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Forbidden resource' }),
    });
    globalThis.fetch = fetchMock;
    await expect(getAnalyticsOverview('invalid-token')).rejects.toThrow('Forbidden resource');

    // 3. fallback error message
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('Parse error');
      },
    });
    globalThis.fetch = fetchMock;
    await expect(getAnalyticsOverview('invalid-token')).rejects.toThrow(
      'Failed to fetch platform analytics overview.'
    );
  });
});
