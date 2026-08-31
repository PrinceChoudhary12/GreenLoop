import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import type { WasteReport } from '../../types/report';
import './Reports.css';

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Waste', PLASTIC: 'Plastic', PAPER: 'Paper', GLASS: 'Glass',
  METAL: 'Metal', E_WASTE: 'E-Waste', ORGANIC: 'Organic', HAZARDOUS: 'Hazardous', OTHER: 'Other',
};

function statusForBadge(status: string): 'healthy' | 'degraded' | 'unhealthy' {
  if (status === 'RESOLVED') return 'healthy';
  if (status === 'REJECTED') return 'unhealthy';
  return 'degraded';
}

export const Reports: React.FC = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setReports(await reportService.getReports(token));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, [token]);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">My Reports</h1>
          <p className="page-subtitle">All waste reports you have submitted to GreenLoop.</p>
        </div>
        <div className="reports-actions">
          <button className="btn btn-ghost btn-sm" onClick={loadReports} disabled={loading} aria-label="Refresh reports">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <Link to="/report-waste" className="btn btn-primary btn-md reports-cta">
            <Plus size={16} aria-hidden="true" />
            New Report
          </Link>
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
          <div className="empty-icon">🗂️</div>
          <h2>No reports yet</h2>
          <p>Start contributing to a cleaner community by submitting your first waste report.</p>
          <Link to="/report-waste" className="btn btn-primary btn-md">Report Waste</Link>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="reports-table-wrap">
          <table className="reports-table" aria-label="My waste reports">
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
              {reports.map(r => (
                <tr key={r.id} className="report-row">
                  <td className="report-id">{r.id}</td>
                  <td className="report-cat">{CATEGORY_LABELS[r.category]}</td>
                  <td className="report-loc">{r.location}</td>
                  <td><PriorityBadge priority={r.priority} /></td>
                  <td><StatusBadge status={statusForBadge(r.status)} label={r.status.replace('_', ' ')} /></td>
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
    </div>
  );
};
