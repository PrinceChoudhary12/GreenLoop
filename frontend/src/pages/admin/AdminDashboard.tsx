import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Lock,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { adminService } from '../../services/adminService';
import { pickupService } from '../../services/pickupService';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { AdminMetrics, AdminReport, AdminUser, CollectorLookupItem } from '../../types/admin';
import type { ReportStatus } from '../../types/report';
import type { Pickup, PickupStatus } from '../../types/pickup';
import './AdminDashboard.css';

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

export const AdminDashboard: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [collectors, setCollectors] = useState<CollectorLookupItem[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);

  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'pickups'>('users');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userActiveFilter, setUserActiveFilter] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Report filters
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('');
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('');
  const [reportPriorityFilter, setReportPriorityFilter] = useState<string>('');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');

  // Pickup filters
  const [pickupStatusFilter, setPickupStatusFilter] = useState<string>('');
  const [pickupSearchQuery, setPickupSearchQuery] = useState<string>('');

  // Assignment state modal / selection
  const [selectedReportForAssign, setSelectedReportForAssign] = useState<AdminReport | null>(null);
  const [selectedCollectorId, setSelectedCollectorId] = useState<number | ''>('');

  // Pickup Schedule / Assign Modal state
  const [selectedPickupForSchedule, setSelectedPickupForSchedule] = useState<Pickup | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState<string>('Morning (09:00 - 12:00)');
  const [scheduleCollectorId, setScheduleCollectorId] = useState<number | ''>('');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');

  const loadAllData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const activeParam =
        userActiveFilter === 'ACTIVE'
          ? true
          : userActiveFilter === 'DEACTIVATED'
          ? false
          : undefined;

      const [m, u, r, c, p] = await Promise.all([
        adminService.getMetrics(token),
        adminService.getUsers(token, {
          role: userRoleFilter || undefined,
          is_active: activeParam,
          search: userSearchQuery.trim() || undefined,
        }),
        adminService.getReports(token, {
          status: reportStatusFilter || undefined,
          category: reportCategoryFilter || undefined,
          priority: reportPriorityFilter || undefined,
          search: reportSearchQuery.trim() || undefined,
        }),
        adminService.getCollectors(token),
        pickupService.getAdminPickups(token, {
          status: (pickupStatusFilter as PickupStatus) || undefined,
          search: pickupSearchQuery.trim() || undefined,
        }),
      ]);
      setMetrics(m);
      setUsers(u);
      setReports(r);
      setCollectors(c);
      setPickups(p);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load administrator data.');
    } finally {
      setLoading(false);
    }
  }, [
    token,
    userRoleFilter,
    userActiveFilter,
    userSearchQuery,
    reportStatusFilter,
    reportCategoryFilter,
    reportPriorityFilter,
    reportSearchQuery,
    pickupStatusFilter,
    pickupSearchQuery,
  ]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const activeParam =
      userActiveFilter === 'ACTIVE'
        ? true
        : userActiveFilter === 'DEACTIVATED'
        ? false
        : undefined;

    Promise.all([
      adminService.getMetrics(token),
      adminService.getUsers(token, {
        role: userRoleFilter || undefined,
        is_active: activeParam,
        search: userSearchQuery.trim() || undefined,
      }),
      adminService.getReports(token, {
        status: reportStatusFilter || undefined,
        category: reportCategoryFilter || undefined,
        priority: reportPriorityFilter || undefined,
        search: reportSearchQuery.trim() || undefined,
      }),
      adminService.getCollectors(token),
      pickupService.getAdminPickups(token, {
        status: (pickupStatusFilter as PickupStatus) || undefined,
        search: pickupSearchQuery.trim() || undefined,
      }),
    ])
      .then(([m, u, r, c, p]) => {
        if (isMounted) {
          setMetrics(m);
          setUsers(u);
          setReports(r);
          setCollectors(c);
          setPickups(p);
          setErrorMessage(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load administrator data.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    token,
    userRoleFilter,
    userActiveFilter,
    userSearchQuery,
    reportStatusFilter,
    reportCategoryFilter,
    reportPriorityFilter,
    reportSearchQuery,
    pickupStatusFilter,
    pickupSearchQuery,
  ]);

  const handleToggleUserStatus = async (targetUser: AdminUser) => {
    if (!token) return;
    const nextStatus = !targetUser.is_active;
    setActionInProgress(`user-${targetUser.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await adminService.updateUserStatus(token, targetUser.id, nextStatus);
      setSuccessMessage(
        `User ${targetUser.name} (${targetUser.email}) is now ${nextStatus ? 'Activated' : 'Deactivated'}.`
      );
      await loadAllData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update user status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAssignCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedReportForAssign || !selectedCollectorId) return;
    setActionInProgress(`assign-${selectedReportForAssign.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await adminService.assignReport(
        token,
        selectedReportForAssign.id,
        Number(selectedCollectorId)
      );
      setSuccessMessage(`Report #${updated.id} successfully assigned to ${updated.collector_name}.`);
      setSelectedReportForAssign(null);
      setSelectedCollectorId('');
      await loadAllData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to assign collector.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStatusOverride = async (reportId: number, targetStatus: ReportStatus) => {
    if (!token) return;
    setActionInProgress(`status-${reportId}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await adminService.updateReportStatus(token, reportId, targetStatus);
      setSuccessMessage(`Report #${updated.id} status updated to ${targetStatus.replace('_', ' ')}.`);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to override report status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSchedulePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPickupForSchedule || !scheduleDate) return;
    setActionInProgress(`schedule-${selectedPickupForSchedule.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await pickupService.schedulePickup(token, selectedPickupForSchedule.id, {
        scheduled_date: scheduleDate,
        time_slot: scheduleTimeSlot,
        collector_id: scheduleCollectorId ? Number(scheduleCollectorId) : undefined,
        notes: scheduleNotes.trim() || undefined,
      });
      setSuccessMessage(
        `Pickup #${updated.id} scheduled for ${scheduleDate} (${scheduleTimeSlot})${
          updated.collector ? ` and assigned to ${updated.collector.name}` : ''
        }.`
      );
      setSelectedPickupForSchedule(null);
      setScheduleDate('');
      setScheduleCollectorId('');
      setScheduleNotes('');
      await loadAllData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to schedule pickup.');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Executive Header */}
      <section className="admin-header">
        <div className="admin-greeting">
          <div className="admin-eyebrow">
            <span className="role-pill-admin">
              <ShieldCheck size={14} aria-hidden="true" /> Administrative Portal
            </span>
            <span className="admin-badge">System Root Access</span>
          </div>
          <h1 className="admin-title">System Administration</h1>
          <p className="admin-subtitle">
            Welcome, {currentUser?.name}. Monitor platform health, manage user accounts, and coordinate citywide collection operations.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm refresh-btn"
          onClick={loadAllData}
          disabled={loading}
          aria-label="Refresh administrator metrics"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </section>

      {/* KPI Ribbons */}
      <section className="admin-metrics-grid" aria-label="Systemwide metrics">
        <div className="metric-card">
          <div className="metric-icon-wrap icon-users">
            <Users size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{metrics?.total_users ?? '—'}</span>
            <span className="metric-label">Total Users ({metrics?.total_citizens ?? 0} Citizens, {metrics?.total_collectors ?? 0} Collectors)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-active-users">
            <UserCheck size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{metrics?.active_users ?? '—'}</span>
            <span className="metric-label">Active Users ({metrics?.deactivated_users ?? 0} Inactive)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-reports">
            <Inbox size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{metrics?.total_reports ?? '—'}</span>
            <span className="metric-label">Total Reports ({metrics?.submitted_reports ?? 0} Pending)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap icon-resolved">
            <Truck size={22} aria-hidden="true" />
          </div>
          <div className="metric-body">
            <span className="metric-value">{pickups.length}</span>
            <span className="metric-label">Total Pickups ({pickups.filter(p => ['REQUESTED', 'SCHEDULED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(p.status)).length} Active)</span>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {errorMessage && (
        <div className="admin-alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="admin-alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabbed Workspace */}
      <section className="admin-workspace">
        <div className="admin-workspace-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'users'}
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            User Directory
            <span className="tab-counter">{users.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'reports'}
            className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <PackageCheck size={16} />
            Platform Waste Reports
            <span className="tab-counter">{reports.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'pickups'}
            className={`admin-tab-btn ${activeTab === 'pickups' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickups')}
          >
            <Truck size={16} />
            Pickup Logistics
            <span className="tab-counter">{pickups.length}</span>
          </button>
        </div>

        {/* Tab 1: User Directory */}
        {activeTab === 'users' && (
          <div className="tab-pane" role="tabpanel">
            <div className="filter-toolbar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Roles</option>
                  <option value="CITIZEN">Citizens</option>
                  <option value="COLLECTOR">Collectors</option>
                  <option value="ADMIN">Administrators</option>
                </select>

                <select
                  value={userActiveFilter}
                  onChange={e => setUserActiveFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="DEACTIVATED">Deactivated Only</option>
                </select>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="admin-empty-state">
                <Users size={48} className="empty-icon" />
                <h3>No users found</h3>
                <p>Try adjusting your search query or filter options.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table" aria-label="Platform Users">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Activity</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={!u.is_active ? 'row-deactivated' : ''}>
                        <td className="cell-id">#{u.id}</td>
                        <td>
                          <div className="user-info-cell">
                            <span className="user-name">{u.name}</span>
                            <span className="user-email">{u.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge role-badge-${u.role.toLowerCase()}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="cell-activity">
                          {u.role === 'CITIZEN' && (
                            <span>{u.reports_count} reports submitted</span>
                          )}
                          {u.role === 'COLLECTOR' && (
                            <span>{u.assigned_reports_count} tasks assigned</span>
                          )}
                          {u.role === 'ADMIN' && <span className="text-muted">Root Admin</span>}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              u.is_active ? 'pill-active' : 'pill-inactive'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="cell-date">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {u.id === currentUser?.id ? (
                            <span className="self-tag">
                              <Lock size={12} /> You
                            </span>
                          ) : (
                            <button
                              className={`btn btn-sm ${
                                u.is_active ? 'btn-ghost text-danger' : 'btn-secondary'
                              }`}
                              disabled={actionInProgress === `user-${u.id}`}
                              onClick={() => handleToggleUserStatus(u)}
                              aria-label={`${
                                u.is_active ? 'Deactivate' : 'Activate'
                              } user ${u.name}`}
                            >
                              {u.is_active ? (
                                <>
                                  <UserX size={14} /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck size={14} /> Activate
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Platform Waste Reports */}
        {activeTab === 'reports' && (
          <div className="tab-pane" role="tabpanel">
            <div className="filter-toolbar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search description or location..."
                  value={reportSearchQuery}
                  onChange={e => setReportSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <select
                  value={reportStatusFilter}
                  onChange={e => setReportStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <select
                  value={reportCategoryFilter}
                  onChange={e => setReportCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>

                <select
                  value={reportPriorityFilter}
                  onChange={e => setReportPriorityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="admin-empty-state">
                <PackageCheck size={48} className="empty-icon" />
                <h3>No waste reports found</h3>
                <p>Try adjusting your search query or filter options.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table" aria-label="Platform Waste Reports">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Category & Priority</th>
                      <th>Location</th>
                      <th>Reporter</th>
                      <th>Assigned Collector</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td className="cell-id">#{r.id}</td>
                        <td>
                          <div className="cat-prio-cell">
                            <span className="category-tag">
                              {CATEGORY_LABELS[r.category] || r.category}
                            </span>
                            <PriorityBadge priority={r.priority} />
                          </div>
                        </td>
                        <td>
                          <div className="location-cell">
                            <span className="loc-title">{r.location}</span>
                            <span className="loc-desc">{r.description}</span>
                            {r.image_path && (
                              <a
                                href={r.image_path}
                                target="_blank"
                                rel="noreferrer"
                                className="img-link"
                              >
                                <ExternalLink size={12} /> View Photo
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="user-info-cell">
                            <span className="user-name">{r.user_name || 'Citizen'}</span>
                            <span className="user-email">#{r.user_id}</span>
                          </div>
                        </td>
                        <td>
                          {r.collector_name ? (
                            <div className="collector-assigned-cell">
                              <Truck size={14} className="collector-icon" />
                              <div>
                                <span className="collector-name">{r.collector_name}</span>
                                <span className="collector-id">ID: #{r.collector_id}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="unassigned-pill">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge
                            status={getStatusForBadge(r.status)}
                            label={r.status.replace('_', ' ')}
                          />
                        </td>
                        <td className="cell-date">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="report-actions-cell">
                            {r.status !== 'RESOLVED' && r.status !== 'REJECTED' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedReportForAssign(r);
                                  setSelectedCollectorId(r.collector_id || '');
                                }}
                                aria-label={`Assign collector to report #${r.id}`}
                              >
                                <UserPlus size={14} /> Assign
                              </button>
                            )}

                            {r.status !== 'RESOLVED' && (
                              <button
                                className="btn btn-ghost btn-sm text-success"
                                disabled={actionInProgress === `status-${r.id}`}
                                onClick={() => handleStatusOverride(r.id, 'RESOLVED')}
                                aria-label={`Resolve report #${r.id}`}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Pickup Logistics */}
        {activeTab === 'pickups' && (
          <div className="tab-pane" role="tabpanel">
            <div className="filter-toolbar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search report location, notes, or citizen phone..."
                  value={pickupSearchQuery}
                  onChange={e => setPickupSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <select
                  value={pickupStatusFilter}
                  onChange={e => setPickupStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Pickup Statuses</option>
                  <option value="REQUESTED">Requested</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {pickups.length === 0 ? (
              <div className="admin-empty-state">
                <Truck size={48} className="empty-icon" />
                <h3>No pickups found</h3>
                <p>No waste pickup requests match your filter criteria.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table" aria-label="Platform Pickups">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Linked Report</th>
                      <th>Citizen</th>
                      <th>Assigned Collector</th>
                      <th>Schedule Window</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickups.map(p => (
                      <tr key={p.id}>
                        <td>
                          <span className="user-id-badge">#{p.id}</span>
                        </td>
                        <td>
                          <div className="report-desc-cell">
                            <span className="report-cat-tag">
                              Report #{p.report_id} {p.report?.category && `• ${p.report.category}`}
                            </span>
                            <span className="report-loc">{p.report?.location || 'Location in report'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{p.user?.name || `User #${p.user_id}`}</span>
                            <span className="user-email">{p.contact_phone || p.user?.email}</span>
                          </div>
                        </td>
                        <td>
                          {p.collector ? (
                            <div className="collector-assigned-tag">
                              <UserCheck size={14} />
                              <span>{p.collector.name}</span>
                            </div>
                          ) : (
                            <span className="collector-unassigned-tag">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div className="schedule-cell">
                            <span className="schedule-date">
                              {p.scheduled_date ? new Date(p.scheduled_date).toLocaleDateString() : 'Unscheduled'}
                            </span>
                            <span className="schedule-slot">{p.time_slot || 'Pending slot'}</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            status={getStatusForBadge(p.status)}
                            label={p.status.replace('_', ' ')}
                          />
                        </td>
                        <td>
                          <div className="report-actions-cell">
                            {p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.status !== 'IN_PROGRESS' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedPickupForSchedule(p);
                                  setScheduleDate(
                                    p.scheduled_date
                                      ? new Date(p.scheduled_date).toISOString().split('T')[0]
                                      : ''
                                  );
                                  setScheduleTimeSlot(p.time_slot || 'Morning (09:00 - 12:00)');
                                  setScheduleCollectorId(p.collector_id || '');
                                  setScheduleNotes(p.notes || '');
                                }}
                              >
                                <Calendar size={14} /> Schedule & Assign
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Report Assignment Modal Dialog */}
      {selectedReportForAssign && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="modal-header">
              <h2>Assign Collector to Report #{selectedReportForAssign.id}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedReportForAssign(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-detail">
                <strong>Location:</strong> {selectedReportForAssign.location}
              </p>
              <p className="modal-detail">
                <strong>Category:</strong> {CATEGORY_LABELS[selectedReportForAssign.category] || selectedReportForAssign.category}
              </p>
              <p className="modal-detail">
                <strong>Description:</strong> {selectedReportForAssign.description}
              </p>

              <form onSubmit={handleAssignCollector} className="assign-form">
                <label htmlFor="collector-select" className="form-label">
                  Select Active Collector
                </label>
                <select
                  id="collector-select"
                  value={selectedCollectorId}
                  onChange={e => setSelectedCollectorId(Number(e.target.value))}
                  required
                  className="form-select"
                >
                  <option value="">-- Choose a collector --</option>
                  {collectors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email}) — {c.active_tasks_count} active tasks
                    </option>
                  ))}
                </select>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-md"
                    onClick={() => setSelectedReportForAssign(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={!selectedCollectorId || actionInProgress === `assign-${selectedReportForAssign.id}`}
                  >
                    {actionInProgress === `assign-${selectedReportForAssign.id}` ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Schedule & Assign Modal Dialog */}
      {selectedPickupForSchedule && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="modal-header">
              <h2>Schedule Pickup #{selectedPickupForSchedule.id}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedPickupForSchedule(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-detail">
                <strong>Linked Report:</strong> #{selectedPickupForSchedule.report_id}
                {selectedPickupForSchedule.report?.location && ` (${selectedPickupForSchedule.report.location})`}
              </p>
              <p className="modal-detail">
                <strong>Citizen Phone:</strong> {selectedPickupForSchedule.contact_phone || 'None provided'}
              </p>

              <form onSubmit={handleSchedulePickupSubmit} className="assign-form">
                <div className="form-group">
                  <label htmlFor="adminScheduleDate" className="form-label">
                    Scheduled Date *
                  </label>
                  <input
                    id="adminScheduleDate"
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    required
                    className="filter-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminTimeSlot" className="form-label">
                    Time Window *
                  </label>
                  <select
                    id="adminTimeSlot"
                    value={scheduleTimeSlot}
                    onChange={e => setScheduleTimeSlot(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="Morning (09:00 - 12:00)">Morning (09:00 - 12:00)</option>
                    <option value="Afternoon (12:00 - 16:00)">Afternoon (12:00 - 16:00)</option>
                    <option value="Evening (16:00 - 19:00)">Evening (16:00 - 19:00)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="adminPickupCollector" className="form-label">
                    Assign Collector (Optional)
                  </label>
                  <select
                    id="adminPickupCollector"
                    value={scheduleCollectorId}
                    onChange={e => setScheduleCollectorId(e.target.value ? Number(e.target.value) : '')}
                    className="form-select"
                  >
                    <option value="">-- No collector assigned (Schedule only) --</option>
                    {collectors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email}) — {c.active_tasks_count} active tasks
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="adminPickupNotes" className="form-label">
                    Administrative Notes
                  </label>
                  <textarea
                    id="adminPickupNotes"
                    rows={2}
                    value={scheduleNotes}
                    onChange={e => setScheduleNotes(e.target.value)}
                    placeholder="e.g. Dispatched for secondary sorting route"
                    className="filter-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-md"
                    onClick={() => setSelectedPickupForSchedule(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={!scheduleDate || actionInProgress === `schedule-${selectedPickupForSchedule.id}`}
                  >
                    {actionInProgress === `schedule-${selectedPickupForSchedule.id}`
                      ? 'Saving...'
                      : 'Confirm Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
