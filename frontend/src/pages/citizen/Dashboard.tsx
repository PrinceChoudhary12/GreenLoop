import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import type { WasteReport } from '../../types/report';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getReports(token);
      setReports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, [token]);

  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;
  const submitted = reports.filter(r => r.status === 'SUBMITTED').length;
  const recent = reports.slice(0, 5);

  return (
    <div className="dashboard">
      <section className="dashboard-greeting">
        <div>
          <h1 className="greeting-title">{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="greeting-subtitle">Here's a snapshot of your GreenLoop activity.</p>
        </div>
        <Link to="/report-waste" className="btn btn-primary btn-md report-cta">
          <Plus size={16} aria-hidden="true" />
          Report Waste
        </Link>
      </section>

      <section className="stats-grid" aria-label="Activity overview">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-blue">
            <ClipboardList size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-green">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-yellow">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div className="stat-value">{submitted}</div>
          <div className="stat-label">Awaiting Review</div>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-header">
          <h2 className="section-title">Recent Reports</h2>
          <div className="section-actions">
            <button className="btn btn-ghost btn-sm" onClick={loadReports} disabled={loading} aria-label="Refresh reports">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            <Link to="/reports" className="btn btn-outline btn-sm">View all</Link>
          </div>
        </div>

        {loading && (
          <div className="loading-state" aria-live="polite" aria-label="Loading reports">
            <div className="loading-spinner" aria-hidden="true" />
            <p>Loading your reports...</p>
          </div>
        )}

        {!loading && error && (
          <div className="error-state" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌿</div>
            <h3>No reports yet</h3>
            <p>Help keep your community clean by reporting waste in your area.</p>
            <Link to="/report-waste" className="btn btn-primary btn-md">Submit your first report</Link>
          </div>
        )}

        {!loading && !error && recent.length > 0 && (
          <div className="report-list">
            {recent.map(report => (
              <Link to={`/reports/${report.id}`} key={report.id} className="report-list-item" aria-label={`View report: ${CATEGORY_LABELS[report.category]}`}>
                <div className="report-list-left">
                  <span className="report-category">{CATEGORY_LABELS[report.category]}</span>
                  <span className="report-location">{report.location}</span>
                </div>
                <div className="report-list-right">
                  <PriorityBadge priority={report.priority} />
                  <StatusBadge status={getStatusForBadge(report.status)} label={report.status.replace('_', ' ')} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
