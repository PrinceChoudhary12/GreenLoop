import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { pickupService } from '../../services/pickupService';
import type { Pickup } from '../../types/pickup';
import './RequestPickupModal.css';

interface RequestPickupModalProps {
  reportId: number;
  reportLocation?: string;
  onSuccess: (pickup: Pickup) => void;
  onClose: () => void;
}

const TIME_SLOTS = [
  'Morning (09:00 - 12:00)',
  'Afternoon (12:00 - 16:00)',
  'Evening (16:00 - 19:00)',
];

export const RequestPickupModal: React.FC<RequestPickupModalProps> = ({
  reportId,
  reportLocation,
  onSuccess,
  onClose,
}) => {
  const { token } = useAuth();
  const [contactPhone, setContactPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState(TIME_SLOTS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const pickup = await pickupService.requestPickup(token, {
        report_id: reportId,
        contact_phone: contactPhone.trim() || undefined,
        preferred_date: preferredDate || undefined,
        preferred_time_slot: preferredTimeSlot || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(pickup);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit pickup request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container pickup-modal">
        <div className="modal-header">
          <h3>Request Scheduled Pickup</h3>
          <button className="close-btn" onClick={onClose} disabled={loading} aria-label="Close">
            &times;
          </button>
        </div>

        {error && <div className="modal-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="pickup-form">
          <p className="modal-subtitle">
            Schedule a waste collection visit for Report <strong>#{reportId}</strong>
            {reportLocation && ` (${reportLocation})`}.
          </p>

          <div className="form-group">
            <label htmlFor="contactPhone">Contact Phone (Optional)</label>
            <input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              disabled={loading}
              maxLength={50}
            />
            <small>Collectors may call for location access or gate codes.</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="preferredDate">Preferred Date</label>
              <input
                id="preferredDate"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="preferredTimeSlot">Preferred Window</label>
              <select
                id="preferredTimeSlot"
                value={preferredTimeSlot}
                onChange={(e) => setPreferredTimeSlot(e.target.value)}
                disabled={loading}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Access Notes / Instructions (Optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bags are by the blue garage door. Ring bell #3."
              disabled={loading}
              maxLength={1000}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Confirm Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
