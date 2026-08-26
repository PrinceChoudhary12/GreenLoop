import React from 'react';
import { Server, Database, RefreshCw, ShieldCheck, Layers, Cpu } from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import type { HealthResponse } from '../types/health';
import './Home.css';

interface HomeProps {
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const Home: React.FC<HomeProps> = ({
  health,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Layers size={14} aria-hidden="true" />
          <span>Milestone 01 — Master Architecture &amp; Foundation</span>
        </div>
        <h1 className="hero-title">
          Intelligent Waste Management &amp; Recycling Platform
        </h1>
        <p className="hero-description">
          A socially driven ecosystem connecting citizens, collectors, and recycling centers.
          Architected for high reliability, modular scalability, and measurable environmental impact.
        </p>
      </section>

      {/* Grid: Health Status & Architectural Pillars */}
      <div className="dashboard-grid">
        {/* System & Dependency Health Card */}
        <Card
          title="System Health & Readiness"
          subtitle="Real-time backend and database operational status"
          action={
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'spin' : ''} />}
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh system status"
            >
              {loading ? 'Probing...' : 'Refresh'}
            </Button>
          }
        >
          {error ? (
            <div className="health-error-box" role="alert">
              <p className="error-title">Backend Connection Notice</p>
              <p className="error-text">
                Could not connect to FastAPI backend ({error}). Ensure the backend server is running on port 8000.
              </p>
            </div>
          ) : (
            <div className="health-details">
              <div className="health-stat-row">
                <div className="stat-label-group">
                  <Server size={18} className="stat-icon" aria-hidden="true" />
                  <div>
                    <div className="stat-name">API Gateway (FastAPI)</div>
                    <div className="stat-meta">
                      Version {health?.version || '1.0.0'} &bull; {health?.environment || 'development'}
                    </div>
                  </div>
                </div>
                <StatusBadge
                  status={health?.status || 'connecting'}
                  label={health?.status === 'healthy' ? 'Operational' : undefined}
                />
              </div>

              <div className="health-stat-row">
                <div className="stat-label-group">
                  <Database size={18} className="stat-icon" aria-hidden="true" />
                  <div>
                    <div className="stat-name">Database Connectivity</div>
                    <div className="stat-meta">
                      {health?.components?.database?.details || 'SQLAlchemy Connection Pool Probe'}
                    </div>
                  </div>
                </div>
                <StatusBadge
                  status={health?.components?.database?.status || 'connecting'}
                  label={health?.components?.database?.status === 'healthy' ? 'Connected' : undefined}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Foundation Architecture Pillars */}
        <Card
          title="Architecture Foundations"
          subtitle="Core engineering principles implemented in this milestone"
        >
          <div className="pillars-list">
            <div className="pillar-item">
              <div className="pillar-icon">
                <Layers size={18} aria-hidden="true" />
              </div>
              <div className="pillar-content">
                <h4>Layered Domain Separation</h4>
                <p>Decoupled API routes, services, repositories, and ORM models for maintainability.</p>
              </div>
            </div>

            <div className="pillar-item">
              <div className="pillar-icon">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <div className="pillar-content">
                <h4>Robust Error Handling &amp; Sanitized Logs</h4>
                <p>Centralized exception handler and automated credential masking in loggers.</p>
              </div>
            </div>

            <div className="pillar-item">
              <div className="pillar-icon">
                <Cpu size={18} aria-hidden="true" />
              </div>
              <div className="pillar-content">
                <h4>Data Access &amp; Migration Ready</h4>
                <p>Standardized repository patterns ready for SQLite to PostgreSQL transitions.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Development Roadmap State */}
      <section className="roadmap-section">
        <h2 className="section-title">Milestone Roadmap</h2>
        <div className="roadmap-grid">
          <div className="roadmap-card current">
            <div className="roadmap-header">
              <span className="step-tag">Milestone 01</span>
              <span className="badge-current">Completed</span>
            </div>
            <h3>Architecture &amp; Project Foundation</h3>
            <p>Scaffolding, API versioning, health probe, database foundation, logging, UI design tokens.</p>
          </div>

          <div className="roadmap-card upcoming">
            <div className="roadmap-header">
              <span className="step-tag">Milestone 02</span>
              <span className="badge-upcoming">Planned</span>
            </div>
            <h3>Authentication &amp; User Domains</h3>
            <p>Secure identity, citizen and collector profiles, role-based authorization.</p>
          </div>

          <div className="roadmap-card upcoming">
            <div className="roadmap-header">
              <span className="step-tag">Milestone 03</span>
              <span className="badge-upcoming">Planned</span>
            </div>
            <h3>Waste Reporting &amp; Collection</h3>
            <p>Citizen reporting, waste categorization, collector dispatching, impact analytics.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
