import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { reportService } from '../../services/reportService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { ActivityTimeline } from '../../components/activity/ActivityTimeline';
import { activityService } from '../../services/activityService';
import type { WasteReport } from '../../types/report';
import type { ActivityLogItem } from '../../types/activity';
import './Dashboard.css';

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Waste', PLASTIC: 'Plastic', PAPER: 'Paper', GLASS: 'Glass',
  METAL: 'Metal', E_WASTE: 'E-Waste', ORGANIC: 'Organic', HAZARDOUS: 'Hazardous', OTHER: 'Other',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusForBadge(status: string): 'healthy' | 'degraded' | 'unhealthy' {
  if (status === 'RESOLVED') return 'healthy';
  if (status === 'REJECTED') return 'unhealthy';
  return 'degraded';
}

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [reportsData, activityData] = await Promise.all([
        reportService.getReports(token),
        activityService.fetchCitizenActivity(token, 0, 8),
      ]);
      setReports(reportsData);
      setActivities(activityData.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setActivityLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;
  const submitted = reports.filter(r => r.status === 'SUBMITTED').length;
  const inProgress = reports.filter(r => ['UNDER_REVIEW', 'ACCEPTED'].includes(r.status)).length;
  const recent = reports.slice(0, 5);

  return (
    <div className="dashboard">
      <section className="dashboard-greeting">
        <div>
          <h1 className="greeting-title">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="greeting-sub">Welcome back to your GreenLoop citizen dashboard.</p>
        </div>
        <Link to="/report-waste" className="btn btn-primary btn-md report-cta">
          <Plus size={16} aria-hidden="true" />
          Report Waste
        </Link>
      </section>

      <section className="dashboard-metrics" aria-label="Key statistics">
        <div className="metric-card">
          <div className="metric-icon-wrap icon-primary">
            <ClipboardList size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{loading ? '—' : total}</span>
            <span className="metric-label">Total Reports</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-warning">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{loading ? '—' : submitted}</span>
            <span className="metric-label">Submitted / Pending</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-info">
            <RefreshCw size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{loading ? '—' : inProgress}</span>
            <span className="metric-label">In Progress</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-success">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{loading ? '—' : resolved}</span>
            <span className="metric-label">Resolved</span>
          </div>
        </div>
      </section>

      <section className="dashboard-recent">
        <div className="section-header">
          <div>
            <h2 className="section-title">Recent Reports</h2>
            <p className="section-subtitle">Your most recently submitted waste reports.</p>
          </div>
          <div className="section-actions">
            <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={loading} aria-label="Refresh reports">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            <Link to="/reports" className="view-all-link">View all →</Link>
          </div>
        </div>

        {loading && (
          <div className="loading-state" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true" />
            <p>Loading reports...</p>
          </div>
        )}

        {!loading && error && (
          <div className="error-state" role="alert"><p>{error}</p></div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌱</div>
            <h2>No reports yet</h2>
            <p>You have not submitted any waste reports. Start helping your community today!</p>
            <Link to="/report-waste" className="btn btn-primary btn-md">Report Waste Now</Link>
          </div>
        )}

        {!loading && !error && recent.length > 0 && (
          <div className="reports-table-wrap">
            <table className="reports-table" aria-label="Recent waste reports">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Category</th>
                  <th scope="col">Location</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id} className="report-row">
                    <td className="report-id">{r.id}</td>
                    <td className="report-cat">{CATEGORY_LABELS[r.category]}</td>
                    <td className="report-loc">{r.location}</td>
                    <td><PriorityBadge priority={r.priority} /></td>
                    <td><StatusBadge status={getStatusForBadge(r.status)} label={r.status.replace('_', ' ')} /></td>
                    <td className="report-date">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/reports/${r.id}`} className="view-link" aria-label={`View report #${r.id}`}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-activity" style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">My Activity Timeline</h2>
            <p className="section-subtitle">Real-time history of your reports and pickup requests.</p>
          </div>
        </div>
        <ActivityTimeline
          activities={activities}
          loading={activityLoading}
          emptyMessage="No activity recorded yet. Submit a report or request a pickup to see your timeline."
          showActor={false}
        />
      </section>
    </div>
  );
};
