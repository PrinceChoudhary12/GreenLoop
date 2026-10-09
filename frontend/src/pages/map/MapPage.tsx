import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
  Layers,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Truck,
  UserCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { locationService } from '../../services/locationService';
import type { MapPointItem, UserLocationResponse } from '../../types/location';
import './MapPage.css';

type FilterType = 'all' | 'report' | 'pickup' | 'collector';

export const MapPage: React.FC = () => {
  const { token, user } = useAuth();
  const [points, setPoints] = useState<MapPointItem[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPoint, setSelectedPoint] = useState<MapPointItem | null>(null);

  // Geolocation & consent states
  const [isSharingActive, setIsSharingActive] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState<boolean>(false);

  // SVG Canvas zoom & view states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const loadData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await locationService.fetchMapData(token);
      setPoints(data.points || []);
      if (data.user_location) {
        setUserLocation(data.user_location);
        setIsSharingActive(data.user_location.is_sharing_active);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load map data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle explicit location sharing consent toggle
  const handleConsentToggle = async () => {
    if (!token || isUpdatingConsent) return;
    setIsUpdatingConsent(true);
    setGeoError(null);
    try {
      const nextConsent = !isSharingActive;
      const updated = await locationService.toggleLocationConsent(token, nextConsent);
      setUserLocation(updated);
      setIsSharingActive(updated.is_sharing_active);
      localStorage.setItem('greenloop_location_consent', String(updated.is_sharing_active));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update location consent';
      setGeoError(msg);
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  // Trigger browser GPS request and send updated coordinates to backend
  const handleRequestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (token) {
          try {
            const updated = await locationService.updateUserLocation(
              token,
              latitude,
              longitude,
              true, // activate location sharing on explicit GPS request
            );
            setUserLocation(updated);
            setIsSharingActive(true);
            localStorage.setItem('greenloop_location_consent', 'true');
            // Refresh map data to include updated location
            await loadData();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save location to server';
            setGeoError(msg);
          }
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please allow access in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location information is currently unavailable.');
            break;
          case err.TIMEOUT:
            setGeoError('Location request timed out.');
            break;
          default:
            setGeoError('An unknown error occurred while retrieving location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Filter map points
  const filteredPoints = useMemo(() => {
    if (activeFilter === 'all') return points;
    return points.filter((p) => p.point_type === activeFilter);
  }, [points, activeFilter]);

  // Coordinate projections for SVG map canvas (default bounding box auto-scaling)
  const bounds = useMemo(() => {
    const allLats = points.map((p) => p.latitude);
    const allLngs = points.map((p) => p.longitude);
    if (userLocation?.latitude && userLocation?.longitude) {
      allLats.push(userLocation.latitude);
      allLngs.push(userLocation.longitude);
    }

    if (allLats.length === 0) {
      return { minLat: 37.7, maxLat: 37.8, minLng: -122.5, maxLng: -122.3 };
    }

    let minLat = Math.min(...allLats);
    let maxLat = Math.max(...allLats);
    let minLng = Math.min(...allLngs);
    let maxLng = Math.max(...allLngs);

    // Padding if coordinates are single point or very close
    if (maxLat - minLat < 0.01) {
      minLat -= 0.02;
      maxLat += 0.02;
    }
    if (maxLng - minLng < 0.01) {
      minLng -= 0.02;
      maxLng += 0.02;
    }

    return { minLat, maxLat, minLng, maxLng };
  }, [points, userLocation]);

  const mapWidth = 800;
  const mapHeight = 460;
  const padding = 50;

  const projectPoint = useCallback(
    (lat: number, lng: number) => {
      const latRange = bounds.maxLat - bounds.minLat || 1;
      const lngRange = bounds.maxLng - bounds.minLng || 1;

      // Invert Y for latitude since SVG 0 is top
      const x = padding + ((lng - bounds.minLng) / lngRange) * (mapWidth - padding * 2);
      const y = mapHeight - padding - ((lat - bounds.minLat) / latRange) * (mapHeight - padding * 2);

      // Apply zoom & center offset
      const cx = mapWidth / 2;
      const cy = mapHeight / 2;
      const zoomedX = cx + (x - cx) * zoomLevel + centerOffset.x;
      const zoomedY = cy + (y - cy) * zoomLevel + centerOffset.y;

      return { x: zoomedX, y: zoomedY };
    },
    [bounds, zoomLevel, centerOffset],
  );

  const getPointColor = (type: string, isStale?: boolean) => {
    if (isStale) return 'var(--color-warning, #e63946)';
    switch (type) {
      case 'report':
        return '#e63946'; // Red accent for incident reports
      case 'pickup':
        return '#f4a261'; // Orange for pickup dispatches
      case 'collector':
        return '#2a9d8f'; // Teal/Green for active collectors
      default:
        return '#2d6a4f';
    }
  };

  const getPointIcon = (type: string) => {
    switch (type) {
      case 'report':
        return <AlertTriangle size={14} color="#ffffff" />;
      case 'pickup':
        return <MapPin size={14} color="#ffffff" />;
      case 'collector':
        return <Truck size={14} color="#ffffff" />;
      default:
        return <MapPin size={14} color="#ffffff" />;
    }
  };

  const counts = useMemo(
    () => ({
      all: points.length,
      report: points.filter((p) => p.point_type === 'report').length,
      pickup: points.filter((p) => p.point_type === 'pickup').length,
      collector: points.filter((p) => p.point_type === 'collector').length,
    }),
    [points],
  );

  return (
    <div className="map-page-container">
      {/* Header Banner */}
      <div className="map-header-card">
        <div className="map-header-main">
          <div className="map-icon-badge">
            <Compass size={28} />
          </div>
          <div>
            <h1 className="map-page-title">Live Geospatial & Dispatch Map</h1>
            <p className="map-page-subtitle">
              Monitor active waste incidents, scheduled pickup points, and verified collector dispatches in real-time.
            </p>
          </div>
        </div>

        <div className="map-header-actions">
          <button className="btn btn-ghost" onClick={loadData} disabled={isLoading} title="Refresh Map Data">
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className={`btn ${isSharingActive ? 'btn-success' : 'btn-outline'}`}
            onClick={handleConsentToggle}
            disabled={isUpdatingConsent}
          >
            {isSharingActive ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
            <span>{isSharingActive ? 'Sharing Enabled' : 'Sharing Disabled'}</span>
          </button>
        </div>
      </div>

      {/* Geolocation & Privacy Notice */}
      <div className={`map-consent-banner ${isSharingActive ? 'active' : 'disabled'}`}>
        <div className="consent-banner-left">
          {isSharingActive ? (
            <ShieldCheck size={20} className="text-success" />
          ) : (
            <ShieldOff size={20} className="text-muted" />
          )}
          <div>
            <strong>Location Privacy Status: {isSharingActive ? 'Opted-In' : 'Opted-Out'}</strong>
            <p>
              {isSharingActive
                ? 'Your location sharing is active. Authorized dispatches and map updates can utilize your current coordinates.'
                : 'Location sharing is strictly disabled. Toggle consent above to enable live routing.'}
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleRequestBrowserLocation}
          disabled={isLocating}
        >
          <Navigation size={14} className={isLocating ? 'spinning' : ''} />
          <span>{isLocating ? 'Acquiring GPS...' : 'Update My Location'}</span>
        </button>
      </div>

      {/* Geo Error Alert */}
      {geoError && (
        <div className="map-alert map-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{geoError}</span>
          <button className="alert-close" onClick={() => setGeoError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Map Control Bar & Filters */}
      <div className="map-controls-bar">
        <div className="filter-chips" role="group" aria-label="Filter Map Markers">
          <button
            className={`chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <Filter size={14} />
            <span>All ({counts.all})</span>
          </button>
          <button
            className={`chip chip-report ${activeFilter === 'report' ? 'active' : ''}`}
            onClick={() => setActiveFilter('report')}
          >
            <AlertTriangle size={14} />
            <span>Reports ({counts.report})</span>
          </button>
          <button
            className={`chip chip-pickup ${activeFilter === 'pickup' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pickup')}
          >
            <MapPin size={14} />
            <span>Pickups ({counts.pickup})</span>
          </button>
          <button
            className={`chip chip-collector ${activeFilter === 'collector' ? 'active' : ''}`}
            onClick={() => setActiveFilter('collector')}
          >
            <Truck size={14} />
            <span>Collectors ({counts.collector})</span>
          </button>
        </div>

        <div className="map-zoom-tools">
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.8))}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            className="zoom-btn"
            onClick={() => {
              setZoomLevel(1);
              setCenterOffset({ x: 0, y: 0 });
            }}
            title="Reset View"
          >
            <Layers size={16} />
          </button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="map-viewport-card">
        {isLoading ? (
          <div className="map-loading-overlay">
            <RefreshCw size={32} className="spinning text-brand" />
            <p>Loading geospatial markers...</p>
          </div>
        ) : error ? (
          <div className="map-empty-state">
            <AlertCircle size={40} className="text-error" />
            <h3>Unable to Load Map Data</h3>
            <p>{error}</p>
            <button className="btn btn-outline btn-sm" onClick={loadData}>
              Try Again
            </button>
          </div>
        ) : (
          <div className="map-canvas-wrapper">
            <svg
              className="map-svg-canvas"
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Background Grid Pattern */}
              <defs>
                <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.6" />
                </pattern>
                <radialGradient id="user-pulse-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2d6a4f" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2d6a4f" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Map background fill */}
              <rect width="100%" height="100%" fill="#f8faf9" />
              <rect width="100%" height="100%" fill="url(#map-grid)" />

              {/* Zone / Connection guide lines between points */}
              {filteredPoints.length > 1 && (
                <path
                  d={filteredPoints
                    .map((p, idx) => {
                      const pt = projectPoint(p.latitude, p.longitude);
                      return `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
              )}

              {/* Render User Location Beacon if present and valid */}
              {userLocation?.latitude && userLocation?.longitude && (
                <g className="user-location-beacon">
                  {(() => {
                    const pt = projectPoint(userLocation.latitude, userLocation.longitude);
                    return (
                      <>
                        <circle cx={pt.x} cy={pt.y} r="20" fill="url(#user-pulse-grad)" className="pulse-circle" />
                        <circle cx={pt.x} cy={pt.y} r="8" fill="#2d6a4f" stroke="#ffffff" strokeWidth="2" />
                        <text
                          x={pt.x}
                          y={pt.y - 14}
                          textAnchor="middle"
                          className="map-beacon-label"
                        >
                          You
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Render Map Points */}
              {filteredPoints.map((point) => {
                const pt = projectPoint(point.latitude, point.longitude);
                const color = getPointColor(point.point_type, point.is_stale);
                const isSelected = selectedPoint?.id === point.id;

                return (
                  <g
                    key={point.id}
                    className={`map-marker ${point.is_stale ? 'stale' : 'live'} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedPoint(point)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Marker Ring selection aura */}
                    {isSelected && (
                      <circle cx={pt.x} cy={pt.y} r="18" fill="none" stroke={color} strokeWidth="2" opacity="0.8" />
                    )}

                    {/* Stale location warning ring */}
                    {point.is_stale && (
                      <circle cx={pt.x} cy={pt.y} r="14" fill="none" stroke="#e63946" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}

                    {/* Marker Pin Base */}
                    <circle cx={pt.x} cy={pt.y} r="12" fill={color} stroke="#ffffff" strokeWidth="2" />

                    {/* Icon Label overlay */}
                    <foreignObject x={pt.x - 7} y={pt.y - 7} width="14" height="14" className="marker-icon-box">
                      <div className="marker-icon-inner">{getPointIcon(point.point_type)}</div>
                    </foreignObject>

                    {/* Title tooltip on hover / render */}
                    <text x={pt.x} y={pt.y + 22} textAnchor="middle" className="map-marker-label">
                      {point.title.length > 18 ? `${point.title.slice(0, 16)}...` : point.title}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Map Legend overlay */}
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-dot report-dot"></span>
                <span>Waste Incident</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot pickup-dot"></span>
                <span>Pickup Route</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot collector-dot"></span>
                <span>Active Collector</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot stale-dot"></span>
                <span>Stale (&gt;15m)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Point Detail Drawer / Card */}
      {selectedPoint && (
        <div className="map-point-detail-card" role="region" aria-label="Point details">
          <div className="detail-card-header">
            <div className="detail-title-group">
              <span className={`point-type-badge type-${selectedPoint.point_type}`}>
                {selectedPoint.point_type.toUpperCase()}
              </span>
              <h3>{selectedPoint.title}</h3>
            </div>
            <button className="close-btn" onClick={() => setSelectedPoint(null)} aria-label="Close details">
              <X size={16} />
            </button>
          </div>

          <div className="detail-card-body">
            {selectedPoint.description && <p className="detail-desc">{selectedPoint.description}</p>}

            <div className="detail-meta-grid">
              <div className="meta-item">
                <MapPin size={14} className="text-muted" />
                <span>
                  Coordinates: {selectedPoint.latitude.toFixed(4)}, {selectedPoint.longitude.toFixed(4)}
                </span>
              </div>

              <div className="meta-item">
                <Clock size={14} className="text-muted" />
                <span>Updated: {new Date(selectedPoint.updated_at).toLocaleString()}</span>
              </div>

              {selectedPoint.status && (
                <div className="meta-item">
                  <CheckCircle2 size={14} className="text-muted" />
                  <span>Status: {selectedPoint.status}</span>
                </div>
              )}

              <div className="meta-item">
                {selectedPoint.is_stale ? (
                  <span className="badge badge-warning">
                    <AlertTriangle size={12} /> Stale Data (&gt;15m)
                  </span>
                ) : (
                  <span className="badge badge-success">
                    <UserCheck size={12} /> Live Tracking
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Notice */}
      <div className="map-role-notice">
        <ShieldCheck size={16} />
        <span>
          Role ({user?.role || 'CITIZEN'}): Live collector GPS positions are restricted to assigned dispatch zones and authorized platform administrators.
        </span>
      </div>
    </div>
  );
};
