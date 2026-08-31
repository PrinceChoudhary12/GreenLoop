import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Tag, Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import type { WasteReport } from '../../types/report';
import './ReportDetail.css';

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Waste', PLASTIC: 'Plastic', PAPER: 'Paper', GLASS: 'Glass',
  METAL: 'Metal', E_WASTE: 'Electronic Waste', ORGANIC: 'Organic', HAZARDOUS: 'Hazardous', OTHER: 'Other',
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function statusForBadge(status: string): 'healthy' | 'degraded' | 'unhealthy' {
  if (status === 'RESOLVED') return 'healthy';
  if (status === 'REJECTED') return 'unhealthy';
  return 'degraded';
}

export const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<WasteReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setError('Invalid report ID.');
      setLoading(false);
      return;
    }
    setLoading(true);
    reportService
      .getReport(token, numId)
      .then(data => setReport(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <div className="loading-state" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="detail-error">
        <div className="error-state" role="alert"><p>{error || 'Report not found.'}</p></div>
        <Link to="/reports" className="btn btn-outline btn-md back-link">← Back to Reports</Link>
      </div>
    );
  }

  return (
    <div className="report-detail-page">
      <div className="detail-header">
        <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate('/reports')} aria-label="Back to reports">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Reports
        </button>
        <div className="detail-badges">
          <PriorityBadge priority={report.priority} />
          <StatusBadge status={statusForBadge(report.status)} label={report.status.replace('_', ' ')} />
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-title-row">
          <h1 className="detail-title">{CATEGORY_LABELS[report.category]}</h1>
          <span className="detail-id">Report #{report.id}</span>
        </div>

        <div className="detail-meta-grid">
          <div className="detail-meta-item">
            <Tag size={14} aria-hidden="true" />
            <span className="meta-label">Category</span>
            <span className="meta-value">{CATEGORY_LABELS[report.category]}</span>
          </div>
          <div className="detail-meta-item">
            <MapPin size={14} aria-hidden="true" />
            <span className="meta-label">Location</span>
            <span className="meta-value">{report.location}</span>
          </div>
          <div className="detail-meta-item">
            <Flag size={14} aria-hidden="true" />
            <span className="meta-label">Priority</span>
            <span className="meta-value">{report.priority}</span>
          </div>
          <div className="detail-meta-item">
            <Calendar size={14} aria-hidden="true" />
            <span className="meta-label">Submitted</span>
            <span className="meta-value">{new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>

        {report.description && (
          <div className="detail-section">
            <h2 className="detail-section-title">Description</h2>
            <p className="detail-description">{report.description}</p>
          </div>
        )}

        {report.image_url && (
          <div className="detail-section">
            <h2 className="detail-section-title">Photo</h2>
            <img
              src={`${API_BASE}${report.image_url}`}
              alt="Waste photo submitted with report"
              className="detail-image"
            />
          </div>
        )}
      </div>
    </div>
  );
};
