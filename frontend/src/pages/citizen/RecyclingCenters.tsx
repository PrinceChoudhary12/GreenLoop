import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Recycle,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { recyclingCenterService } from '../../services/recyclingCenterService';
import type { RecyclingCenter } from '../../types/recyclingCenter';
import { parseCategoryList } from '../../types/recyclingCenter';
import './RecyclingCenters.css';

const WASTE_CATEGORIES = [
  'GENERAL', 'PLASTIC', 'PAPER', 'GLASS',
  'METAL', 'E_WASTE', 'ORGANIC', 'HAZARDOUS', 'OTHER',
] as const;

// ── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rc-skeleton-card" aria-hidden="true">
      <div className="rc-skeleton-line title" />
      <div className="rc-skeleton-line addr" />
      <div className="rc-skeleton-line chips" />
      <div className="rc-skeleton-line footer" />
    </div>
  );
}

// ── Category chip ────────────────────────────────────────────────────────────

function CatChip({ label }: { label: string }) {
  return <span className="rc-cat-chip">{label.replace('_', ' ')}</span>;
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  center: RecyclingCenter;
  onClose: () => void;
}

function DetailModal({ center, onClose }: DetailModalProps) {
  const cats = parseCategoryList(center.accepted_categories);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="rc-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Recycling center details: ${center.name}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rc-modal">
        <div className="rc-modal-header">
          <div>
            <div className="rc-modal-title">{center.name}</div>
            <span className={`rc-status-badge ${center.is_active ? 'active' : 'inactive'}`}>
              {center.is_active ? <CheckCircle2 size={10} /> : <X size={10} />}
              {center.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button className="rc-modal-close" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        <div className="rc-modal-body">
          {center.description && (
            <>
              <p className="rc-modal-description">{center.description}</p>
              <hr className="rc-modal-divider" />
            </>
          )}

          {/* Address */}
          <div className="rc-modal-row">
            <MapPin size={16} className="rc-modal-row-icon" />
            <div className="rc-modal-row-content">
              <span className="rc-modal-row-label">Address</span>
              <span className="rc-modal-row-value">{center.address}</span>
            </div>
          </div>

          {/* Accepted Categories */}
          {cats.length > 0 && (
            <div className="rc-modal-row">
              <Recycle size={16} className="rc-modal-row-icon" />
              <div className="rc-modal-row-content">
                <span className="rc-modal-row-label">Accepts</span>
                <div className="rc-modal-categories">
                  {cats.map(c => (
                    <span key={c} className="rc-modal-cat-chip">{c.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {center.opening_hours && (
            <div className="rc-modal-row">
              <Clock size={16} className="rc-modal-row-icon" />
              <div className="rc-modal-row-content">
                <span className="rc-modal-row-label">Opening Hours</span>
                <span className="rc-modal-row-value">{center.opening_hours}</span>
              </div>
            </div>
          )}

          {/* Phone */}
          {center.phone && (
            <div className="rc-modal-row">
              <Phone size={16} className="rc-modal-row-icon" />
              <div className="rc-modal-row-content">
                <span className="rc-modal-row-label">Phone</span>
                <span className="rc-modal-row-value">
                  <a href={`tel:${center.phone}`}>{center.phone}</a>
                </span>
              </div>
            </div>
          )}

          {/* Email */}
          {center.email && (
            <div className="rc-modal-row">
              <Mail size={16} className="rc-modal-row-icon" />
              <div className="rc-modal-row-content">
                <span className="rc-modal-row-label">Email</span>
                <span className="rc-modal-row-value">
                  <a href={`mailto:${center.email}`}>{center.email}</a>
                </span>
              </div>
            </div>
          )}

          {/* Website */}
          {center.website && (
            <div className="rc-modal-row">
              <Globe size={16} className="rc-modal-row-icon" />
              <div className="rc-modal-row-content">
                <span className="rc-modal-row-label">Website</span>
                <span className="rc-modal-row-value">
                  <a href={center.website} target="_blank" rel="noopener noreferrer">
                    {center.website} <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </a>
                </span>
              </div>
            </div>
          )}

          {/* Coordinates / Map link */}
          {center.latitude != null && center.longitude != null && (
            <div className="rc-modal-row">
              <MapPin size={16} className="rc-modal-row-icon" />
              <div className="rc-modal-row-content">
                <span className="rc-modal-row-label">Location on Map</span>
                <span className="rc-modal-row-value">
                  <Link to="/map">View on interactive map →</Link>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export const RecyclingCenters: React.FC = () => {
  const { token } = useAuth();
  const [centers, setCenters] = useState<RecyclingCenter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedCenter, setSelectedCenter] = useState<RecyclingCenter | null>(null);

  const loadCenters = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await recyclingCenterService.listCenters(token, { is_active: true, limit: 100 });
      setCenters(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load recycling centers.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCenters(); }, [loadCenters]);

  const filtered = useMemo(() => {
    const q = localSearch.toLowerCase().trim();
    return centers.filter(c => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q);

      const matchCat =
        !categoryFilter ||
        (c.accepted_categories || '').toUpperCase().includes(categoryFilter.toUpperCase());

      return matchSearch && matchCat;
    });
  }, [centers, localSearch, categoryFilter]);

  return (
    <section className="rc-page" aria-label="Recycling Centers Directory">
      {/* Header */}
      <div className="rc-header">
        <div className="rc-header-text">
          <h1>Recycling Centers</h1>
          <p>Find certified facilities in your area that accept recyclable waste.</p>
        </div>
        <Link to="/map" className="rc-map-link" aria-label="View centers on map">
          <MapPin size={15} />
          View on Map
        </Link>
      </div>

      {/* Toolbar */}
      <div className="rc-toolbar" role="search" aria-label="Filter recycling centers">
        <div className="rc-search-wrap">
          <Search size={15} aria-hidden="true" />
          <input
            id="rc-search-input"
            type="search"
            className="rc-search-input"
            placeholder="Search by name or address…"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            aria-label="Search recycling centers"
          />
        </div>

        <select
          id="rc-category-filter"
          className="rc-filter-select"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          aria-label="Filter by waste category"
        >
          <option value="">All Categories</option>
          {WASTE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
          ))}
        </select>

        {!isLoading && !error && (
          <span className="rc-result-count" aria-live="polite">
            {filtered.length} of {centers.length} center{centers.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="rc-skeleton-grid" aria-label="Loading recycling centers" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="rc-error" role="alert" aria-live="assertive">
          <AlertCircle size={48} />
          <h3>Could Not Load Centers</h3>
          <p>{error}</p>
          <button id="rc-retry-btn" className="rc-retry-btn" onClick={loadCenters}>
            <RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} />
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rc-empty" role="status">
          <Building2 size={56} />
          <h3>{centers.length === 0 ? 'No Centers Listed Yet' : 'No Results Found'}</h3>
          <p>
            {centers.length === 0
              ? 'No recycling centers have been added to the platform yet. Check back soon.'
              : 'Try adjusting your search or category filter.'}
          </p>
        </div>
      ) : (
        <div
          className="rc-grid"
          role="list"
          aria-label={`${filtered.length} recycling centers`}
        >
          {filtered.map(center => {
            const cats = parseCategoryList(center.accepted_categories);
            return (
              <article
                key={center.id}
                className="rc-card"
                role="listitem"
                onClick={() => setSelectedCenter(center)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedCenter(center); }}
                tabIndex={0}
                aria-label={`${center.name} — ${center.address}`}
              >
                <div className="rc-card-header">
                  <span className="rc-card-name">{center.name}</span>
                  <span className={`rc-status-badge ${center.is_active ? 'active' : 'inactive'}`}>
                    {center.is_active ? <CheckCircle2 size={10} /> : <X size={10} />}
                    {center.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="rc-card-address">
                  <MapPin size={13} aria-hidden="true" />
                  <span>{center.address}</span>
                </div>

                {cats.length > 0 && (
                  <div className="rc-categories" aria-label="Accepted categories">
                    {cats.slice(0, 4).map(c => <CatChip key={c} label={c} />)}
                    {cats.length > 4 && <span className="rc-cat-chip">+{cats.length - 4}</span>}
                  </div>
                )}

                <div className="rc-card-footer">
                  <div className="rc-contact-icons" aria-label="Contact info available">
                    {center.phone && <Phone size={13} aria-label="Phone available" />}
                    {center.email && <Mail size={13} aria-label="Email available" />}
                    {center.website && <Globe size={13} aria-label="Website available" />}
                  </div>
                  {center.opening_hours && (
                    <span className="rc-hours">
                      <Clock size={11} aria-hidden="true" />
                      {center.opening_hours.split('\n')[0]}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCenter && (
        <DetailModal center={selectedCenter} onClose={() => setSelectedCenter(null)} />
      )}
    </section>
  );
};
