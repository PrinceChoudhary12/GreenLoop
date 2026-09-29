import type { WasteCategory } from './report';

export type TimeRange = '7d' | '30d' | '90d' | 'all';
export type TrendInterval = 'day' | 'week' | 'month';

export interface AnalyticsOverviewResponse {
  time_range: TimeRange;
  start_date: string | null;
  end_date: string;
  total_reports: number;
  resolved_reports: number;
  resolution_rate: number;
  total_pickups: number;
  completed_pickups: number;
  pickup_completion_rate: number;
  avg_resolution_turnaround_hours: number;
  active_collectors: number;
  active_citizens: number;
}

export interface CategoryMetricItem {
  category: WasteCategory;
  label: string;
  report_count: number;
  percentage: number;
  resolved_count: number;
  resolution_rate: number;
}

export interface CategoryAnalyticsResponse {
  time_range: TimeRange;
  total_reports: number;
  categories: CategoryMetricItem[];
}

export interface TrendDataPoint {
  timestamp: string;
  label: string;
  submitted_reports: number;
  resolved_reports: number;
  requested_pickups: number;
  completed_pickups: number;
}

export interface TrendAnalyticsResponse {
  time_range: TimeRange;
  interval: TrendInterval;
  data_points: TrendDataPoint[];
}

export interface CollectorPerformanceItem {
  collector_id: number;
  name: string;
  email: string;
  is_active: boolean;
  assigned_reports: number;
  resolved_reports: number;
  assigned_pickups: number;
  completed_pickups: number;
  resolution_rate: number;
  avg_completion_time_hours: number;
}

export interface CollectorPerformanceResponse {
  time_range: TimeRange;
  collectors: CollectorPerformanceItem[];
}
