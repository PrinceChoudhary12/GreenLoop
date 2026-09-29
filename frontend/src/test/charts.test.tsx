import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  MetricCard,
  DonutChart,
  LineChart,
  BarChart,
} from '../components/charts';

describe('MetricCard', () => {
  it('renders title, value, subtitle, and badge correctly', () => {
    render(
      <MetricCard
        title="Total Reports"
        value={128}
        subtitle="Across all districts"
        changeText="+12% from last week"
        changeType="positive"
        testId="test-metric"
      />
    );

    expect(screen.getByRole('heading', { name: 'Total Reports' })).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Across all districts')).toBeInTheDocument();
    expect(screen.getByText('+12% from last week')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    render(
      <MetricCard
        title="Resolution Rate"
        value="85%"
        loading={true}
        testId="test-metric-loading"
      />
    );

    const skeleton = screen.getByTestId('test-metric-loading-loading');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
  });

  it('provides proper accessibility attributes', () => {
    render(
      <MetricCard
        title="Active Collectors"
        value={15}
        ariaLabel="Active Collectors Count: 15"
      />
    );

    const card = screen.getByLabelText('Active Collectors Count: 15');
    expect(card).toBeInTheDocument();
  });
});

describe('DonutChart', () => {
  const sampleData = [
    { label: 'Plastic', value: 40, color: '#2d6a4f' },
    { label: 'Organic', value: 30, color: '#52b788' },
    { label: 'Glass', value: 20, color: '#2563eb' },
    { label: 'Metal', value: 10, color: '#f59e0b' },
  ];

  it('renders SVG and legend for valid non-empty data', () => {
    render(
      <DonutChart
        title="Waste Categories"
        data={sampleData}
        centerLabel="Total Items"
        centerValue={100}
      />
    );

    expect(screen.getByRole('heading', { name: 'Waste Categories' })).toBeInTheDocument();
    expect(screen.getByText('Plastic')).toBeInTheDocument();
    expect(screen.getByText('Organic')).toBeInTheDocument();
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders empty state when data is empty array', () => {
    render(
      <DonutChart
        title="Empty Donut"
        data={[]}
        emptyText="No category data recorded"
      />
    );

    expect(screen.getByText('No category data recorded')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('handles zero-value datasets gracefully without NaN errors', () => {
    render(
      <DonutChart
        title="Zero Data"
        data={[
          { label: 'Plastic', value: 0 },
          { label: 'Paper', value: 0 },
        ]}
        emptyText="Zero items logged"
      />
    );

    expect(screen.getByText('Zero items logged')).toBeInTheDocument();
  });
});

describe('LineChart', () => {
  const sampleSeries = [
    { key: 'submitted', name: 'Submitted Reports', color: '#2d6a4f' },
    { key: 'resolved', name: 'Resolved Reports', color: '#2563eb' },
  ];

  const sampleData = [
    { label: 'Day 1', submitted: 10, resolved: 8 },
    { label: 'Day 2', submitted: 15, resolved: 12 },
    { label: 'Day 3', submitted: 8, resolved: 14 },
  ];

  it('renders SVG, axes, and line paths for supplied data', () => {
    render(
      <LineChart
        title="Report Trends"
        data={sampleData}
        series={sampleSeries}
      />
    );

    expect(screen.getByRole('heading', { name: 'Report Trends' })).toBeInTheDocument();
    expect(screen.getByText('Submitted Reports')).toBeInTheDocument();
    expect(screen.getByText('Resolved Reports')).toBeInTheDocument();
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 3')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders empty state when data array is empty', () => {
    render(
      <LineChart
        title="Empty Trends"
        data={[]}
        series={sampleSeries}
        emptyText="No timeline points"
      />
    );

    expect(screen.getByText('No timeline points')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('handles all-zero data series without broken coordinates', () => {
    render(
      <LineChart
        title="Zero Trends"
        data={[
          { label: 'Day 1', submitted: 0, resolved: 0 },
          { label: 'Day 2', submitted: 0, resolved: 0 },
        ]}
        series={sampleSeries}
      />
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Day 1')).toBeInTheDocument();
  });
});

describe('BarChart', () => {
  const sampleBars = [
    { label: 'Alice C.', value: 25, secondaryValue: 22 },
    { label: 'Bob C.', value: 18, secondaryValue: 15 },
    { label: 'Charlie C.', value: 30, secondaryValue: 28 },
  ];

  it('renders SVG grouped bars, values, and legend', () => {
    render(
      <BarChart
        title="Collector Performance"
        data={sampleBars}
        primaryLabel="Assigned"
        secondaryLabel="Completed"
      />
    );

    expect(screen.getByRole('heading', { name: 'Collector Performance' })).toBeInTheDocument();
    expect(screen.getByText('Alice C.')).toBeInTheDocument();
    expect(screen.getByText('Bob C.')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders single bars when secondaryValue is absent', () => {
    render(
      <BarChart
        title="Single Metric Bars"
        data={[
          { label: 'District A', value: 45 },
          { label: 'District B', value: 60 },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Single Metric Bars' })).toBeInTheDocument();
    expect(screen.getByText('District A')).toBeInTheDocument();
    expect(screen.getByText('District B')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders empty state when data is empty', () => {
    render(
      <BarChart
        title="Empty Collector Performance"
        data={[]}
        emptyText="No active collectors found"
      />
    );

    expect(screen.getByText('No active collectors found')).toBeInTheDocument();
  });

  it('handles zero values without error', () => {
    render(
      <BarChart
        title="Zero Performance"
        data={[{ label: 'New Collector', value: 0, secondaryValue: 0 }]}
      />
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('New Collec…')).toBeInTheDocument();
  });
});
