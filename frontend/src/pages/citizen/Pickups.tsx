import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { pickupService } from '../../services/pickupService';
import type { Pickup, PickupStatus } from '../../types/pickup';
import './Pickups.css';

export const Pickups: React.FC = () => {
  const { token } = useAuth();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Cancel Modal State
  const [cancelModalPickup, setCancelModalPickup] = useState<Pickup | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadPickups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pickupService.getCitizenPickups(token);
      setPickups(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pickup requests.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    if (token) {
      pickupService.getCitizenPickups(token)
        .then((data) => {
          if (isMounted) {
            setPickups(data);
            setLoading(false);
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            setError(err?.message || 'Failed to load pickup requests.');
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cancelModalPickup) return;
    if (cancelReason.trim().length < 3) {
      setCancelError('Please provide a reason of at least 3 characters.');
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    try {
      const updated = await pickupService.cancelPickup(token, cancelModalPickup.id, {
        cancellation_reason: cancelReason.trim(),
      });
      setPickups((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setCancelModalPickup(null);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel pickup.');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredPickups = pickups.filter((p) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') {
      return ['REQUESTED', 'SCHEDULED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(p.status);
    }
    if (statusFilter === 'COMPLETED') return p.status === 'COMPLETED';
    if (statusFilter === 'CANCELLED') return p.status === 'CANCELLED';
    return true;
  });

  const getStatusBadgeClass = (status: PickupStatus) => {
    switch (status) {
      case 'REQUESTED':
        return 'pickup-badge-requested';
      case 'SCHEDULED':
        return 'pickup-badge-scheduled';
      case 'ASSIGNED':
        return 'pickup-badge-assigned';
      case 'ACCEPTED':
        return 'pickup-badge-accepted';
      case 'IN_PROGRESS':
        return 'pickup-badge-progress';
      case 'COMPLETED':
        return 'pickup-badge-completed';
      case 'CANCELLED':
        return 'pickup-badge-cancelled';
      default:
        return '';
    }
  };

  const isCancellableByCitizen = (status: PickupStatus) => {
    return ['REQUESTED', 'SCHEDULED', 'ASSIGNED'].includes(status);
  };

  return (
    <div className="pickups-page-container">
      <div className="pickups-header">
        <div>
          <h2>Scheduled Waste Pickups</h2>
          <p>Track your scheduled on-site waste collection visits and timelines.</p>
        </div>
        <Link to="/reports" className="btn btn-secondary">
          View Waste Reports
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="pickup-filters">
        {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            className={`filter-btn ${statusFilter === tab ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab)}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pickup-loading">Loading scheduled pickups...</div>
      ) : error ? (
        <div className="pickup-error">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={loadPickups}>
            Try Again
          </button>
        </div>
      ) : filteredPickups.length === 0 ? (
        <div className="pickup-empty-state">
          <p>No pickup requests found in this view.</p>
          <Link to="/reports" className="btn btn-primary">
            Request Pickup from Reports
          </Link>
        </div>
      ) : (
        <div className="pickups-grid">
          {filteredPickups.map((pickup) => (
            <div key={pickup.id} className="pickup-card">
              <div className="pickup-card-header">
                <span className="pickup-id">Pickup #{pickup.id}</span>
                <span className={`pickup-status-badge ${getStatusBadgeClass(pickup.status)}`}>
                  {pickup.status.replace('_', ' ')}
                </span>
              </div>

              <div className="pickup-report-info">
                <Link to={`/reports/${pickup.report_id}`} className="report-link">
                  Linked to Report #{pickup.report_id}
                </Link>
                {pickup.report?.category && (
                  <span className="category-tag">{pickup.report.category}</span>
                )}
              </div>

              {pickup.report?.location && (
                <div className="pickup-location">
                  <strong>Location:</strong> {pickup.report.location}
                </div>
              )}

              <div className="pickup-details-grid">
                <div className="detail-item">
                  <span className="label">Scheduled Date</span>
                  <span className="value">
                    {pickup.scheduled_date
                      ? new Date(pickup.scheduled_date).toLocaleDateString()
                      : 'Pending Schedule'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="label">Time Window</span>
                  <span className="value">{pickup.time_slot || 'Pending slot'}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Assigned Collector</span>
                  <span className="value">
                    {pickup.collector ? pickup.collector.name : 'Unassigned'}
                  </span>
                </div>

                {pickup.contact_phone && (
                  <div className="detail-item">
                    <span className="label">Contact Phone</span>
                    <span className="value">{pickup.contact_phone}</span>
                  </div>
                )}
              </div>

              {pickup.notes && (
                <div className="pickup-notes">
                  <strong>Notes:</strong> {pickup.notes}
                </div>
              )}

              {pickup.cancellation_reason && (
                <div className="pickup-cancellation-notice">
                  <strong>Cancelled Reason:</strong> {pickup.cancellation_reason}
                </div>
              )}

              <div className="pickup-card-footer">
                <span className="pickup-timestamp">
                  Requested {new Date(pickup.created_at).toLocaleDateString()}
                </span>

                {isCancellableByCitizen(pickup.status) && (
                  <button
                    className="btn-cancel-pickup"
                    onClick={() => {
                      setCancelModalPickup(pickup);
                      setCancelReason('');
                      setCancelError(null);
                    }}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalPickup && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container cancel-pickup-modal">
            <div className="modal-header">
              <h3>Cancel Pickup #{cancelModalPickup.id}</h3>
              <button
                className="close-btn"
                onClick={() => setCancelModalPickup(null)}
                disabled={cancelLoading}
              >
                &times;
              </button>
            </div>

            {cancelError && <div className="modal-alert error">{cancelError}</div>}

            <form onSubmit={handleCancelSubmit} className="cancel-form">
              <p>Please provide a brief reason for cancelling this scheduled pickup request.</p>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Resolved via community recycling event"
                disabled={cancelLoading}
                required
                minLength={3}
                maxLength={255}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCancelModalPickup(null)}
                  disabled={cancelLoading}
                >
                  Keep Pickup
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={cancelLoading}
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
