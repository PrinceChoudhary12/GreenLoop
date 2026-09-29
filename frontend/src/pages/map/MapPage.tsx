import React, { useState } from 'react';
import { MapPin, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';
import './MapPage.css';

export const MapPage: React.FC = () => {
  const [sharingConsent, setSharingConsent] = useState<boolean>(() => {
    return localStorage.getItem('greenloop_location_consent') === 'true';
  });

  const handleConsentToggle = () => {
    const next = !sharingConsent;
    setSharingConsent(next);
    localStorage.setItem('greenloop_location_consent', String(next));
  };

  return (
    <div className="map-page-container">
      <div className="map-hero-card">
        <div className="map-icon-badge">
          <MapPin size={32} />
        </div>
        <h1 className="map-page-title">Geospatial Waste Map & Live Ops</h1>
        <p className="map-page-subtitle">
          Geospatial waste incident tracking and collector dispatch zones.
        </p>

        {/* Privacy & Consent Notice */}
        <div className="map-consent-card">
          <div className="consent-header">
            <ShieldCheck size={20} className="shield-icon" />
            <div className="consent-text">
              <strong>Location Privacy & Explicit Consent</strong>
              <span>
                Live location sharing is strictly opt-in and revocable at any time. Location data is only used for waste report routing and authorized collector dispatches.
              </span>
            </div>
            <button
              className={`btn btn-sm ${sharingConsent ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleConsentToggle}
            >
              <Navigation size={14} />
              <span>{sharingConsent ? 'Location Sharing: Active' : 'Enable Location Sharing'}</span>
            </button>
          </div>
        </div>

        {/* Map Grid / Info */}
        <div className="map-architecture-grid">
          <div className="arch-card">
            <h3>Waste Report Coordinates</h3>
            <p>Reports submitted by citizens automatically include validated street address coordinates for collection routing.</p>
          </div>
          <div className="arch-card">
            <h3>Collector Fleet Dispatch</h3>
            <p>Active pickup dispatches are routed to verified collectors within the operational zone.</p>
          </div>
        </div>

        <div className="map-status-notice">
          <AlertTriangle size={16} />
          <span>Full interactive map canvas and collector route optimization are being prepared in the upcoming integration phase.</span>
        </div>
      </div>
    </div>
  );
};
