import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  PieChart,
  RefreshCw,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { analyticsService } from '../../services/analyticsService';
import {
  BarChart,
  DonutChart,
  LineChart,
  MetricCard,
} from '../../components/charts';
import type {
  AnalyticsOverviewResponse,
  CategoryAnalyticsResponse,
  CollectorPerformanceResponse,
  TimeRange,
  TrendAnalyticsResponse,
  TrendInterval,
} from '../../types/analytics';
import './AdminAnalytics.css';

export const AdminAnalytics: React.FC = () => {
  const { token } = useAuth();

  // Filter States
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [trendInterval, setTrendInterval] = useState<TrendInterval>('day');

  // Data States
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryAnalyticsResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendAnalyticsResponse | null>(null);
  const [collectorData, setCollectorData] = useState<CollectorPerformanceResponse | null>(null);

  // Loading States
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingCollectors, setLoadingCollectors] = useState(true);

  // Error States
  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [errorTrends, setErrorTrends] = useState<string | null>(null);
  const [errorCollectors, setErrorCollectors] = useState<string | null>(null);

  const isAnyLoading =
    loadingOverview || loadingCategories || loadingTrends || loadingCollectors;

  // Individual Loaders
  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoadingOverview(true);
    setErrorOverview(null);
    try {
      const data = await analyticsService.getAnalyticsOverview(token, timeRange);
      setOverview(data);
    } catch (err: any) {
      setErrorOverview(err?.message || 'Failed to load KPI metrics');
    } finally {
      setLoadingOverview(false);
    }
  }, [token, timeRange]);

  const loadCategories = useCallback(async () => {
    if (!token) return;
    setLoadingCategories(true);
    setErrorCategories(null);
    try {
      const data = await analyticsService.getCategoryAnalytics(token, timeRange);
      setCategoryData(data);
    } catch (err: any) {
      setErrorCategories(err?.message || 'Failed to load waste category distribution');
    } finally {
      setLoadingCategories(false);
    }
  }, [token, timeRange]);

  const loadTrends = useCallback(async () => {
    if (!token) return;
    setLoadingTrends(true);
    setErrorTrends(null);
    try {
      const data = await analyticsService.getTrendAnalytics(token, timeRange, trendInterval);
      setTrendData(data);
    } catch (err: any) {
      setErrorTrends(err?.message || 'Failed to load time-series trends');
    } finally {
      setLoadingTrends(false);
    }
  }, [token, timeRange, trendInterval]);

  const loadCollectors = useCallback(async () => {
    if (!token) return;
    setLoadingCollectors(true);
    setErrorCollectors(null);
    try {
      const data = await analyticsService.getCollectorPerformance(token, timeRange);
      setCollectorData(data);
    } catch (err: any) {
      setErrorCollectors(err?.message || 'Failed to load collector performance');
    } finally {
      setLoadingCollectors(false);
    }
  }, [token, timeRange]);

  // Trigger loads on timeRange change
  useEffect(() => {
    loadOverview();
    loadCategories();
    loadCollectors();
  }, [loadOverview, loadCategories, loadCollectors]);

  // Trigger trend load on timeRange or trendInterval change
  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const handleRefreshAll = () => {
    loadOverview();
    loadCategories();
    loadTrends();
    loadCollectors();
  };

  // Map category data for DonutChart
  const donutSegments = React.useMemo(() => {
    if (!categoryData?.categories) return [];
    return categoryData.categories.map((c) => ({
      label: c.label,
      value: c.report_count,
      percentage: c.percentage,
    }));
  }, [categoryData]);

  // Map trend data for LineChart
  const lineSeries = [
    { key: 'submitted_reports', name: 'Submitted Reports', color: '#2d6a4f' },
    { key: 'resolved_reports', name: 'Resolved Reports', color: '#10b981' },
    { key: 'requested_pickups', name: 'Requested Pickups', color: '#2563eb' },
    { key: 'completed_pickups', name: 'Completed Pickups', color: '#8b5cf6' },
  ];

  // Map collector data for BarChart
  const barItems = React.useMemo(() => {
    if (!collectorData?.collectors) return [];
    return collectorData.collectors.map((col) => ({
      label: col.name,
      value: col.assigned_reports + col.assigned_pickups,
      secondaryValue: col.resolved_reports + col.completed_pickups,
      sublabel: `${col.resolution_rate.toFixed(0)}% resolved`,
    }));
  }, [collectorData]);

  return (
    <div className="analytics-dashboard-page" data-testid="admin-analytics-page">
      {/* Header & Controls */}
      <header className="analytics-header">
        <div className="analytics-header-title">
          <h1>
            <BarChart3 size={28} className="text-brand-primary" aria-hidden="true" />
            Analytics & Reporting
          </h1>
          <p>
            Real-time platform operational metrics, waste stream distribution, and collection performance.
          </p>
        </div>

        <div className="analytics-header-controls">
          <div className="filter-group" role="group" aria-label="Time Range Filter">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((tr) => (
              <button
                key={tr}
                className={`filter-btn ${timeRange === tr ? 'active' : ''}`}
                onClick={() => setTimeRange(tr)}
                aria-pressed={timeRange === tr}
                data-testid={`filter-timerange-${tr}`}
              >
                {tr === '7d'
                  ? '7 Days'
                  : tr === '30d'
                  ? '30 Days'
                  : tr === '90d'
                  ? '90 Days'
                  : 'All Time'}
              </button>
            ))}
          </div>

          <button
            className="refresh-btn"
            onClick={handleRefreshAll}
            disabled={isAnyLoading}
            aria-label="Refresh analytics data"
            data-testid="refresh-analytics-btn"
          >
            <RefreshCw size={14} className={isAnyLoading ? 'spinning' : ''} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* KPI Overview Section */}
      <section aria-label="Platform Overview KPIs">
        {errorOverview ? (
          <div className="section-error-card" role="alert">
            <AlertCircle size={24} aria-hidden="true" />
            <p>{errorOverview}</p>
            <button className="section-retry-btn" onClick={loadOverview}>
              Retry Overview
            </button>
          </div>
        ) : (
          <div className="kpi-grid">
            <MetricCard
              title="Total Reports"
              value={overview?.total_reports ?? 0}
              subtitle={`${overview?.resolved_reports ?? 0} resolved`}
              icon={<FileText size={18} />}
              loading={loadingOverview}
              testId="kpi-total-reports"
            />
            <MetricCard
              title="Resolution Rate"
              value={`${overview?.resolution_rate ? overview.resolution_rate.toFixed(1) : '0.0'}%`}
              subtitle="Target: ≥ 80%"
              changeText={overview && overview.resolution_rate >= 75 ? 'Healthy' : 'Needs Attention'}
              changeType={overview && overview.resolution_rate >= 75 ? 'positive' : 'negative'}
              icon={<CheckCircle2 size={18} />}
              loading={loadingOverview}
              testId="kpi-resolution-rate"
            />
            <MetricCard
              title="Total Pickups"
              value={overview?.total_pickups ?? 0}
              subtitle={`${overview?.completed_pickups ?? 0} completed`}
              icon={<Truck size={18} />}
              loading={loadingOverview}
              testId="kpi-total-pickups"
            />
            <MetricCard
              title="Pickup Completion"
              value={`${overview?.pickup_completion_rate ? overview.pickup_completion_rate.toFixed(1) : '0.0'}%`}
              subtitle="Scheduled jobs"
              changeText={overview && overview.pickup_completion_rate >= 75 ? 'Optimal' : 'Pending'}
              changeType={overview && overview.pickup_completion_rate >= 75 ? 'positive' : 'neutral'}
              icon={<Calendar size={18} />}
              loading={loadingOverview}
              testId="kpi-pickup-rate"
            />
            <MetricCard
              title="Avg Turnaround"
              value={`${overview?.avg_resolution_turnaround_hours ? overview.avg_resolution_turnaround_hours.toFixed(1) : '0.0'} hrs`}
              subtitle="Report to resolution"
              icon={<Clock size={18} />}
              loading={loadingOverview}
              testId="kpi-avg-turnaround"
            />
            <MetricCard
              title="Active Collectors"
              value={overview?.active_collectors ?? 0}
              subtitle="Field personnel"
              icon={<Truck size={18} />}
              loading={loadingOverview}
              testId="kpi-collectors"
            />
            <MetricCard
              title="Active Citizens"
              value={overview?.active_citizens ?? 0}
              subtitle="Registered users"
              icon={<Users size={18} />}
              loading={loadingOverview}
              testId="kpi-citizens"
            />
          </div>
        )}
      </section>

      {/* Category Distribution & Time-Series Trends */}
      <div className="analytics-section-grid">
        {/* Category Breakdown */}
        <section aria-label="Waste Category Distribution">
          {errorCategories ? (
            <div className="section-error-card" role="alert">
              <AlertCircle size={24} aria-hidden="true" />
              <p>{errorCategories}</p>
              <button className="section-retry-btn" onClick={loadCategories}>
                Retry Categories
              </button>
            </div>
          ) : (
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h2>
                  <PieChart size={20} className="text-brand-primary" aria-hidden="true" />
                  Waste Categories
                </h2>
                <p>Breakdown by reported volume</p>
              </div>

              {loadingCategories ? (
                <div className="chart-empty-state">
                  <RefreshCw size={24} className="spinning text-brand-primary" aria-hidden="true" />
                  <p style={{ marginTop: '8px' }}>Loading category breakdown...</p>
                </div>
              ) : (
                <>
                  <DonutChart
                    data={donutSegments}
                    centerLabel="Total Reports"
                    centerValue={categoryData?.total_reports ?? 0}
                    emptyText="No waste reports logged in this time window"
                    testId="category-donut-chart"
                  />

                  {categoryData && categoryData.categories.length > 0 && (
                    <table className="category-summary-table" aria-label="Category Summary Breakdown">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Count</th>
                          <th>Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryData.categories.map((cat) => (
                          <tr key={cat.category}>
                            <td>{cat.label}</td>
                            <td>{cat.report_count} ({cat.percentage.toFixed(1)}%)</td>
                            <td>{cat.resolution_rate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* Time-Series Trends */}
        <section aria-label="Timeline Trend Analysis">
          {errorTrends ? (
            <div className="section-error-card" role="alert">
              <AlertCircle size={24} aria-hidden="true" />
              <p>{errorTrends}</p>
              <button className="section-retry-btn" onClick={loadTrends}>
                Retry Trends
              </button>
            </div>
          ) : (
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h2>
                    <TrendingUp size={20} className="text-brand-primary" aria-hidden="true" />
                    Operational Trends
                  </h2>
                  <p>Submissions, resolutions, and pickups over time</p>
                </div>

                <div className="filter-group" role="group" aria-label="Trend Interval Filter">
                  {(['day', 'week', 'month'] as TrendInterval[]).map((intv) => (
                    <button
                      key={intv}
                      className={`filter-btn ${trendInterval === intv ? 'active' : ''}`}
                      onClick={() => setTrendInterval(intv)}
                      aria-pressed={trendInterval === intv}
                      data-testid={`filter-interval-${intv}`}
                    >
                      {intv.charAt(0).toUpperCase() + intv.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {loadingTrends ? (
                <div className="chart-empty-state">
                  <RefreshCw size={24} className="spinning text-brand-primary" aria-hidden="true" />
                  <p style={{ marginTop: '8px' }}>Loading timeline trends...</p>
                </div>
              ) : (
                <LineChart
                  data={trendData?.data_points ?? []}
                  series={lineSeries}
                  emptyText="No chronological activity data logged in this range"
                  testId="trends-line-chart"
                />
              )}
            </div>
          )}
        </section>
      </div>

      {/* Collector Operational Performance Section */}
      <section aria-label="Collector Operational Performance">
        {errorCollectors ? (
          <div className="section-error-card" role="alert">
            <AlertCircle size={24} aria-hidden="true" />
            <p>{errorCollectors}</p>
            <button className="section-retry-btn" onClick={loadCollectors}>
              Retry Collector Performance
            </button>
          </div>
        ) : (
          <div className="analytics-card">
            <div className="analytics-card-header">
              <div>
                <h2>
                  <Truck size={20} className="text-brand-primary" aria-hidden="true" />
                  Collector Performance & Task Fulfillment
                </h2>
                <p>Assigned workload vs. completed actions</p>
              </div>
            </div>

            {loadingCollectors ? (
              <div className="chart-empty-state">
                <RefreshCw size={24} className="spinning text-brand-primary" aria-hidden="true" />
                <p style={{ marginTop: '8px' }}>Loading collector performance...</p>
              </div>
            ) : (
              <>
                <BarChart
                  data={barItems}
                  primaryLabel="Assigned Tasks"
                  secondaryLabel="Completed Tasks"
                  emptyText="No collector performance data available for this range"
                  testId="collector-bar-chart"
                />

                {collectorData && collectorData.collectors.length > 0 && (
                  <div className="collector-table-wrap">
                    <table className="collector-table" aria-label="Collector Performance Table">
                      <thead>
                        <tr>
                          <th>Collector</th>
                          <th>Status</th>
                          <th>Assigned Reports</th>
                          <th>Resolved Reports</th>
                          <th>Assigned Pickups</th>
                          <th>Completed Pickups</th>
                          <th>Avg Turnaround</th>
                          <th>Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collectorData.collectors.map((col) => (
                          <tr key={col.collector_id}>
                            <td>
                              <strong>{col.name}</strong>
                              <br />
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                {col.email}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`metric-badge ${col.is_active ? 'metric-badge-positive' : 'metric-badge-neutral'}`}
                              >
                                {col.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>{col.assigned_reports}</td>
                            <td>{col.resolved_reports}</td>
                            <td>{col.assigned_pickups}</td>
                            <td>{col.completed_pickups}</td>
                            <td>{col.avg_completion_time_hours > 0 ? `${col.avg_completion_time_hours.toFixed(1)} hrs` : 'N/A'}</td>
                            <td>
                              <strong>{col.resolution_rate.toFixed(1)}%</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
