import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { collectorService, type CollectorMeResponse } from '../../services/collectorService';
import { pickupService } from '../../services/pickupService';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { ReportStatus, WasteReport } from '../../types/report';
import type { Pickup } from '../../types/pickup';
import './CollectorDashboard.css';

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Waste',
  PLASTIC: 'Plastic',
  PAPER: 'Paper',
  GLASS: 'Glass',
  METAL: 'Metal',
  E_WASTE: 'E-Waste',
  ORGANIC: 'Organic',
  HAZARDOUS: 'Hazardous',
  OTHER: 'Other',
};

function getStatusForBadge(status: string): 'healthy' | 'degraded' | 'unhealthy' {
  if (status === 'RESOLVED' || status === 'COMPLETED') return 'healthy';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'unhealthy';
  return 'degraded';
}

export const CollectorDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<CollectorMeResponse | null>(null);
  const [availableReports, setAvailableReports] = useState<WasteReport[]>([]);
  const [assignedReports, setAssignedReports] = useState<WasteReport[]>([]);
  const [assignedPickups, setAssignedPickups] = useState<Pickup[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'assigned' | 'pickups'>('available');
  const [assignedFilter, setAssignedFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [pickupFilter, setPickupFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoadingReports(true);
    setErrorMessage(null);
    try {
      const [me, available, assigned, pickups] = await Promise.all([
        collectorService.getCollectorMe(token),
        collectorService.getAvailableReports(token),
        collectorService.getAssignedReports(token),
        pickupService.getCollectorPickups(token),
      ]);
      setProfile(me);
      setAvailableReports(available);
      setAssignedReports(assigned);
      setAssignedPickups(pickups);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load collector data.');
    } finally {
      setLoadingReports(false);
      setLoadingProfile(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    Promise.all([
      collectorService.getCollectorMe(token),
      collectorService.getAvailableReports(token),
      collectorService.getAssignedReports(token),
      pickupService.getCollectorPickups(token),
    ])
      .then(([me, available, assigned, pickups]) => {
        if (isMounted) {
          setProfile(me);
          setAvailableReports(available);
          setAssignedReports(assigned);
          setAssignedPickups(pickups);
          setErrorMessage(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load collector data.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingReports(false);
          setLoadingProfile(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleClaim = async (reportId: number) => {
    if (!token) return;
    setActionInProgressId(reportId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const claimed = await collectorService.claimReport(token, reportId);
      setSuccessMessage(`Report #${claimed.id} successfully claimed and added to your assigned workload!`);
      // Re-fetch all data to ensure synchronized metrics
      await loadData();
      setActiveTab('assigned');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to claim report.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleStatusUpdate = async (reportId: number, targetStatus: ReportStatus) => {
    if (!token) return;
    setActionInProgressId(reportId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await collectorService.updateReportStatus(token, reportId, targetStatus);
      setSuccessMessage(`Report #${updated.id} status updated to ${targetStatus.replace('_', ' ')}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update report status.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePickupAccept = async (pickupId: number) => {
    if (!token) return;
    setActionInProgressId(pickupId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await pickupService.acceptPickup(token, pickupId);
      setSuccessMessage(`Pickup #${pickupId} accepted! Prepare for route collection.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept pickup.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePickupStart = async (pickupId: number) => {
    if (!token) return;
    setActionInProgressId(pickupId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await pickupService.startPickup(token, pickupId);
      setSuccessMessage(`Pickup #${pickupId} is now in progress.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start pickup transit.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePickupComplete = async (pickupId: number) => {
    if (!token) return;
    setActionInProgressId(pickupId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await pickupService.completePickup(token, pickupId);
      setSuccessMessage(`Pickup #${pickupId} marked complete! Associated report resolved.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to complete pickup.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredAssigned = assignedReports.filter(r => {
    if (assignedFilter === 'ACTIVE') return ['UNDER_REVIEW', 'ACCEPTED'].includes(r.status);
    if (assignedFilter === 'RESOLVED') return r.status === 'RESOLVED';
    return true;
  });

  const filteredPickups = assignedPickups.filter(p => {
    if (pickupFilter === 'ACTIVE') return ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(p.status);
    if (pickupFilter === 'COMPLETED') return p.status === 'COMPLETED';
    return true;
  });

  if (loadingProfile && !profile) {
    return (
      <div className="collector-loading" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Loading collector workspace...</p>
      </div>
    );
  }

  return (
    <div className="collector-dashboard">
      {/* Header / Workspace Banner */}
      <section className="collector-header">
        <div className="collector-greeting">
          <div className="collector-eyebrow">
            <span className="role-pill">
              <Truck size={14} aria-hidden="true" /> Certified Collector
            </span>
            <span className="collector-badge">
              <ShieldCheck size={14} aria-hidden="true" /> Verified Staff
            </span>
          </div>
          <h1 className="collector-title">Collector Workspace</h1>
          <p className="collector-subtitle">
            Welcome back, {user?.name}. Manage your municipal collection queue and update assignment lifecycles.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm refresh-btn"
          onClick={loadData}
          disabled={loadingReports}
          aria-label="Refresh workspace data"
        >
          <RefreshCw size={14} className={loadingReports ? 'spin' : ''} />
          Refresh
        </button>
      </section>

      {/* Workload Metrics */}
      <section className="collector-metrics" aria-label="Collector workload metrics">
        <div className="metric-card">
          <div className="metric-icon-wrap icon-queue">
            <Inbox size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{profile?.metrics.available_count ?? availableReports.length}</span>
            <span className="metric-label">Open in Queue</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-progress">
            <Clock size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{profile?.metrics.active_count ?? 0}</span>
            <span className="metric-label">Active Reports</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-progress">
            <Truck size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">
              {assignedPickups.filter(p => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(p.status)).length}
            </span>
            <span className="metric-label">Active Pickups</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-resolved">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">
              {(profile?.metrics.resolved_count ?? 0) + assignedPickups.filter(p => p.status === 'COMPLETED').length}
            </span>
            <span className="metric-label">Resolved / Completed</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {errorMessage && (
        <div className="collector-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="collector-alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs & Content */}
      <section className="collector-workspace">
        <div className="workspace-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'available'}
            className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            Available Queue
            <span className="tab-counter">{availableReports.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'assigned'}
            className={`tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('assigned')}
          >
            Claimed Reports
            <span className="tab-counter">{assignedReports.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'pickups'}
            className={`tab-btn ${activeTab === 'pickups' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickups')}
          >
            Scheduled Pickups
            <span className="tab-counter">{assignedPickups.length}</span>
          </button>
        </div>

        {/* Tab 1: Available Reports */}
        {activeTab === 'available' && (
          <div className="tab-pane" role="tabpanel">
            <div className="pane-header">
              <div>
                <h2>Available Waste Reports</h2>
                <p>Unassigned citizen reports waiting for a waste collector to claim and process.</p>
              </div>
            </div>

            {availableReports.length === 0 ? (
              <div className="empty-queue-card">
                <Inbox size={48} className="empty-icon" />
                <h3>No reports pending pickup</h3>
                <p>The collection queue is empty. New citizen submissions will appear here automatically.</p>
              </div>
            ) : (
              <div className="reports-grid">
                {availableReports.map(report => (
                  <article key={report.id} className="report-collector-card">
                    <div className="card-top">
                      <div className="card-cat-priority">
                        <span className="category-tag">{CATEGORY_LABELS[report.category] || report.category}</span>
                        <PriorityBadge priority={report.priority} />
                      </div>
                      <span className="report-id-pill">#{report.id}</span>
                    </div>

                    <h3 className="card-location">{report.location}</h3>
                    <p className="card-description">{report.description}</p>

                    {report.image_path && (
                      <div className="card-image-preview">
                        <a
                          href={report.image_path}
                          target="_blank"
                          rel="noreferrer"
                          className="image-link"
                          aria-label="View citizen uploaded photo"
                        >
                          <ExternalLink size={14} /> View Attached Photo
                        </a>
                      </div>
                    )}

                    <div className="card-footer">
                      <div className="card-meta">
                        <span className="card-date">
                          Reported: {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        className="btn btn-primary btn-sm claim-btn"
                        onClick={() => handleClaim(report.id)}
                        disabled={actionInProgressId === report.id}
                        aria-label={`Claim report #${report.id}`}
                      >
                        {actionInProgressId === report.id ? 'Claiming...' : 'Claim Task'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Assigned Reports */}
        {activeTab === 'assigned' && (
          <div className="tab-pane" role="tabpanel">
            <div className="pane-header-with-filter">
              <div>
                <h2>My Assigned Tasks</h2>
                <p>Reports claimed by you. Update their lifecycle status as you progress with collection.</p>
              </div>

              <div className="filter-pill-group" role="group" aria-label="Filter assigned tasks">
                <button
                  className={`filter-pill ${assignedFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setAssignedFilter('ALL')}
                >
                  All ({assignedReports.length})
                </button>
                <button
                  className={`filter-pill ${assignedFilter === 'ACTIVE' ? 'active' : ''}`}
                  onClick={() => setAssignedFilter('ACTIVE')}
                >
                  Active ({assignedReports.filter(r => ['UNDER_REVIEW', 'ACCEPTED'].includes(r.status)).length})
                </button>
                <button
                  className={`filter-pill ${assignedFilter === 'RESOLVED' ? 'active' : ''}`}
                  onClick={() => setAssignedFilter('RESOLVED')}
                >
                  Resolved ({assignedReports.filter(r => r.status === 'RESOLVED').length})
                </button>
              </div>
            </div>

            {filteredAssigned.length === 0 ? (
              <div className="empty-queue-card">
                <PackageCheck size={48} className="empty-icon" />
                <h3>No assigned tasks in this view</h3>
                <p>Check the Available Queue tab to claim reports waiting for collection.</p>
              </div>
            ) : (
              <div className="reports-grid">
                {filteredAssigned.map(report => (
                  <article key={report.id} className="report-collector-card assigned-card">
                    <div className="card-top">
                      <div className="card-cat-priority">
                        <span className="category-tag">{CATEGORY_LABELS[report.category] || report.category}</span>
                        <PriorityBadge priority={report.priority} />
                        <StatusBadge
                          status={getStatusForBadge(report.status)}
                          label={report.status.replace('_', ' ')}
                        />
                      </div>
                      <span className="report-id-pill">#{report.id}</span>
                    </div>

                    <h3 className="card-location">{report.location}</h3>
                    <p className="card-description">{report.description}</p>

                    {report.image_path && (
                      <div className="card-image-preview">
                        <a
                          href={report.image_path}
                          target="_blank"
                          rel="noreferrer"
                          className="image-link"
                          aria-label="View citizen uploaded photo"
                        >
                          <ExternalLink size={14} /> View Attached Photo
                        </a>
                      </div>
                    )}

                    <div className="card-meta">
                      <span className="card-date">
                        Updated: {new Date(report.updated_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="card-actions-row">
                      {report.status === 'UNDER_REVIEW' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionInProgressId === report.id}
                            onClick={() => handleStatusUpdate(report.id, 'ACCEPTED')}
                          >
                            Accept Task
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={actionInProgressId === report.id}
                            onClick={() => handleStatusUpdate(report.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {report.status === 'ACCEPTED' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm btn-resolve"
                            disabled={actionInProgressId === report.id}
                            onClick={() => handleStatusUpdate(report.id, 'RESOLVED')}
                          >
                            <CheckCircle2 size={14} /> Mark Resolved
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={actionInProgressId === report.id}
                            onClick={() => handleStatusUpdate(report.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {['RESOLVED', 'REJECTED'].includes(report.status) && (
                        <span className="task-closed-label">Task finalized ({report.status.toLowerCase()})</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Scheduled Pickups */}
        {activeTab === 'pickups' && (
          <div className="tab-pane" role="tabpanel">
            <div className="pane-header-with-filter">
              <div>
                <h2>Assigned Waste Pickups</h2>
                <p>On-site collection orders assigned to you. Accept, start collection route, and mark completed.</p>
              </div>

              <div className="filter-pill-group" role="group" aria-label="Filter pickups">
                <button
                  className={`filter-pill ${pickupFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setPickupFilter('ALL')}
                >
                  All ({assignedPickups.length})
                </button>
                <button
                  className={`filter-pill ${pickupFilter === 'ACTIVE' ? 'active' : ''}`}
                  onClick={() => setPickupFilter('ACTIVE')}
                >
                  Active ({assignedPickups.filter(p => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(p.status)).length})
                </button>
                <button
                  className={`filter-pill ${pickupFilter === 'COMPLETED' ? 'active' : ''}`}
                  onClick={() => setPickupFilter('COMPLETED')}
                >
                  Completed ({assignedPickups.filter(p => p.status === 'COMPLETED').length})
                </button>
              </div>
            </div>

            {filteredPickups.length === 0 ? (
              <div className="empty-queue-card">
                <Truck size={48} className="empty-icon" />
                <h3>No scheduled pickups in this view</h3>
                <p>Pickups scheduled and assigned to you by administrators will appear here.</p>
              </div>
            ) : (
              <div className="reports-grid">
                {filteredPickups.map(pickup => (
                  <article key={pickup.id} className="report-collector-card assigned-card">
                    <div className="card-top">
                      <div className="card-cat-priority">
                        {pickup.report?.category && (
                          <span className="category-tag">{CATEGORY_LABELS[pickup.report.category] || pickup.report.category}</span>
                        )}
                        <StatusBadge
                          status={getStatusForBadge(pickup.status)}
                          label={pickup.status.replace('_', ' ')}
                        />
                      </div>
                      <span className="report-id-pill">Pickup #{pickup.id}</span>
                    </div>

                    <h3 className="card-location">
                      {pickup.report?.location || 'Location details in report'}
                    </h3>
                    {pickup.report?.description && (
                      <p className="card-description">{pickup.report.description}</p>
                    )}

                    <div className="pickup-schedule-box">
                      <div className="schedule-row">
                        <strong>Date:</strong>{' '}
                        {pickup.scheduled_date ? new Date(pickup.scheduled_date).toLocaleDateString() : 'TBD'}
                      </div>
                      <div className="schedule-row">
                        <strong>Time Window:</strong> {pickup.time_slot || 'Pending slot'}
                      </div>
                      {pickup.contact_phone && (
                        <div className="schedule-row">
                          <strong>Citizen Phone:</strong> {pickup.contact_phone}
                        </div>
                      )}
                    </div>

                    {pickup.notes && (
                      <div className="pickup-notes-card">
                        <strong>Notes:</strong> {pickup.notes}
                      </div>
                    )}

                    {/* Operational Action Controls */}
                    <div className="card-actions-row">
                      {pickup.status === 'ASSIGNED' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionInProgressId === pickup.id}
                          onClick={() => handlePickupAccept(pickup.id)}
                        >
                          <CheckCircle2 size={14} /> Accept Pickup
                        </button>
                      )}

                      {pickup.status === 'ACCEPTED' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionInProgressId === pickup.id}
                          onClick={() => handlePickupStart(pickup.id)}
                        >
                          <Truck size={14} /> Start Route / In Progress
                        </button>
                      )}

                      {pickup.status === 'IN_PROGRESS' && (
                        <button
                          className="btn btn-primary btn-sm btn-resolve"
                          disabled={actionInProgressId === pickup.id}
                          onClick={() => handlePickupComplete(pickup.id)}
                        >
                          <CheckCircle2 size={14} /> Complete & Resolve Report
                        </button>
                      )}

                      {pickup.status === 'COMPLETED' && (
                        <span className="task-closed-label">Pickup completed</span>
                      )}

                      {pickup.status === 'CANCELLED' && (
                        <span className="task-closed-label">Cancelled ({pickup.cancellation_reason || 'N/A'})</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
