import type {
  AnalyticsOverviewResponse,
  CategoryAnalyticsResponse,
  CollectorPerformanceResponse,
  TimeRange,
  TrendAnalyticsResponse,
  TrendInterval,
} from '../types/analytics';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  if (!response.ok) {
    let errorMsg = defaultErrorMsg;
    try {
      const data = await response.json();
      if (data?.error?.message) {
        errorMsg = data.error.message;
      } else if (data?.message) {
        errorMsg = data.message;
      } else if (data?.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // fallback to defaultErrorMsg
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function getAnalyticsOverview(
  token: string,
  timeRange: TimeRange = '30d',
): Promise<AnalyticsOverviewResponse> {
  const params = new URLSearchParams({ time_range: timeRange });
  const response = await fetch(`${API_BASE}/api/v1/analytics/overview?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<AnalyticsOverviewResponse>(response, 'Failed to fetch platform analytics overview.');
}

export async function getCategoryAnalytics(
  token: string,
  timeRange: TimeRange = '30d',
): Promise<CategoryAnalyticsResponse> {
  const params = new URLSearchParams({ time_range: timeRange });
  const response = await fetch(`${API_BASE}/api/v1/analytics/categories?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<CategoryAnalyticsResponse>(response, 'Failed to fetch waste category analytics.');
}

export async function getTrendAnalytics(
  token: string,
  timeRange: TimeRange = '30d',
  interval: TrendInterval = 'day',
): Promise<TrendAnalyticsResponse> {
  const params = new URLSearchParams({
    time_range: timeRange,
    interval: interval,
  });
  const response = await fetch(`${API_BASE}/api/v1/analytics/trends?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<TrendAnalyticsResponse>(response, 'Failed to fetch time-series trend analytics.');
}

export async function getCollectorPerformance(
  token: string,
  timeRange: TimeRange = '30d',
): Promise<CollectorPerformanceResponse> {
  const params = new URLSearchParams({ time_range: timeRange });
  const response = await fetch(`${API_BASE}/api/v1/analytics/collectors-performance?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  return handleResponse<CollectorPerformanceResponse>(
    response,
    'Failed to fetch collector performance analytics.',
  );
}

export const analyticsService = {
  getAnalyticsOverview,
  getCategoryAnalytics,
  getTrendAnalytics,
  getCollectorPerformance,
};
