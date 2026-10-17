import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  FileText,
  Truck,
  PlusCircle,
  BarChart3,
  Bell,
  Activity,
  Settings,
  HelpCircle,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { searchService } from '../../services/searchService';
import type { SearchResultItem } from '../../types/search';
import './SearchModal.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: ('CITIZEN' | 'COLLECTOR' | 'ADMIN')[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'report-waste',
    title: 'Report Waste Incident',
    subtitle: 'Submit a new waste report with location and category',
    to: '/report-waste',
    icon: PlusCircle,
    roles: ['CITIZEN'],
  },
  {
    id: 'my-reports',
    title: 'My Waste Reports',
    subtitle: 'View submitted waste reports and lifecycle status',
    to: '/reports',
    icon: FileText,
    roles: ['CITIZEN', 'ADMIN'],
  },
  {
    id: 'pickups',
    title: 'Pickups & Scheduling',
    subtitle: 'Schedule recycling collection or manage pickup dispatches',
    to: '/pickups',
    icon: Truck,
    roles: ['CITIZEN', 'COLLECTOR', 'ADMIN'],
  },
  {
    id: 'map-view',
    title: 'Live Geospatial Map',
    subtitle: 'Interactive map canvas of active reports and dispatches',
    to: '/map',
    icon: Compass,
    roles: ['CITIZEN', 'COLLECTOR', 'ADMIN'],
  },
  {
    id: 'analytics',
    title: 'Analytics & Impact Studio',
    subtitle: 'Platform metrics, waste categories, trends, and collector KPIs',
    to: '/admin/analytics',
    icon: BarChart3,
    roles: ['ADMIN'],
  },
  {
    id: 'notifications',
    title: 'Notification Center',
    subtitle: 'View all unread dispatches and platform alerts',
    to: '/notifications',
    icon: Bell,
    roles: ['CITIZEN', 'COLLECTOR', 'ADMIN'],
  },
  {
    id: 'activity',
    title: 'Activity Audit Stream',
    subtitle: 'Complete timeline audit of operational events',
    to: '/activity',
    icon: Activity,
    roles: ['CITIZEN', 'COLLECTOR', 'ADMIN'],
  },
  {
    id: 'settings',
    title: 'Platform Settings',
    subtitle: 'Configure theme, notifications, and profile details',
    to: '/settings',
    icon: Settings,
    roles: ['CITIZEN', 'COLLECTOR', 'ADMIN'],
  },
  {
    id: 'help',
    title: 'Knowledge & Help Center',
    subtitle: 'Search platform FAQs and waste sorting guidelines',
    to: '/help',
    icon: HelpCircle,
    roles: ['CITIZEN', 'COLLECTOR', 'ADMIN'],
  },
];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const activeAbortController = useRef<AbortController | null>(null);

  const userRole = user?.role || 'CITIZEN';

  // Quick action shortcuts filtered by role and local string matching
  const filteredActions = QUICK_ACTIONS.filter((action) => {
    if (!action.roles.includes(userRole)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return action.title.toLowerCase().includes(q) || action.subtitle.toLowerCase().includes(q);
  });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
      setError(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced server search execution
  const executeServerSearch = useCallback(
    async (searchQuery: string) => {
      const cleanQ = searchQuery.trim();
      if (cleanQ.length < 2) {
        setSearchResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Abort previous in-flight request
      if (activeAbortController.current) {
        activeAbortController.current.abort();
      }

      const controller = new AbortController();
      activeAbortController.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        if (token) {
          const res = await searchService.searchGlobal(token, cleanQ, 20, controller.signal);
          setSearchResults(res.results || []);
          setSelectedIndex(0);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Ignore aborted request error
        }
        const msg = err instanceof Error ? err.message : 'Search failed';
        setError(msg);
      } finally {
        if (activeAbortController.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [token],
  );

  // Handle query change with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        executeServerSearch(query);
      } else {
        setSearchResults([]);
        setIsLoading(false);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, executeServerSearch]);

  const handleSelectRoute = (to: string) => {
    onClose();
    navigate(to);
  };

  // Keyboard navigation handler (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const totalItems =
        query.trim().length >= 2
          ? searchResults.length
          : filteredActions.length;

      if (totalItems === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim().length >= 2 && searchResults[selectedIndex]) {
          handleSelectRoute(searchResults[selectedIndex].target_url);
        } else if (filteredActions[selectedIndex]) {
          handleSelectRoute(filteredActions[selectedIndex].to);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, query, searchResults, filteredActions, selectedIndex]);

  if (!isOpen) return null;

  const isServerSearch = query.trim().length >= 2;

  return (
    <div className="search-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="search-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Header Input */}
        <div className="search-input-header">
          <Search size={20} className="modal-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="modal-search-input"
            placeholder="Search commands, reports, pickups, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search platform waste reports, pickups, and commands"
          />
          {isLoading && <Loader2 size={18} className="modal-spinner spinning text-brand" />}
          <button className="search-close-btn" onClick={onClose} aria-label="Close search modal">
            <X size={18} />
          </button>
        </div>

        {/* Workspace Security Notice */}
        <div className="search-privacy-notice">
          <Shield size={14} />
          <span>Role-scoped search: returns authorized workspace records for {userRole}.</span>
        </div>

        {/* Live Search Announcement for Accessibility */}
        <div className="sr-only" aria-live="polite">
          {isLoading
            ? 'Searching records...'
            : isServerSearch && searchResults.length > 0
              ? `${searchResults.length} search results found for query ${query}`
              : `${filteredActions.length} quick navigation actions available`}
        </div>

        {/* Search Body Content */}
        <div className="search-results-list" role="listbox">
          {error ? (
            <div className="search-error-state">
              <AlertCircle size={24} className="text-error" />
              <span>{error}</span>
              <button
                className="btn btn-xs btn-outline"
                onClick={() => executeServerSearch(query)}
              >
                Retry
              </button>
            </div>
          ) : isServerSearch && searchResults.length > 0 ? (
            searchResults.map((item, idx) => (
              <button
                key={item.id}
                className={`search-result-item ${selectedIndex === idx ? 'focused' : ''}`}
                onClick={() => handleSelectRoute(item.target_url)}
                role="option"
                aria-selected={selectedIndex === idx}
              >
                <div className="result-icon-wrap">
                  {item.entity_type === 'report' ? (
                    <FileText size={18} className="text-report" />
                  ) : (
                    <Truck size={18} className="text-pickup" />
                  )}
                </div>

                <div className="result-text">
                  <div className="result-title-row">
                    <span className="result-title">{item.title}</span>
                    {item.status && (
                      <span className={`status-pill pill-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    )}
                  </div>

                  {item.subtitle && <div className="result-subtitle">{item.subtitle}</div>}

                  {item.created_at && (
                    <div className="result-meta">
                      <Clock size={12} />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <ArrowRight size={14} className="result-arrow" />
              </button>
            ))
          ) : filteredActions.length > 0 ? (
            filteredActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className={`search-result-item ${selectedIndex === idx ? 'focused' : ''}`}
                  onClick={() => handleSelectRoute(action.to)}
                  role="option"
                  aria-selected={selectedIndex === idx}
                >
                  <div className="result-icon-wrap">
                    <Icon size={18} />
                  </div>
                  <div className="result-text">
                    <div className="result-title">{action.title}</div>
                    <div className="result-subtitle">{action.subtitle}</div>
                  </div>
                  <ArrowRight size={14} className="result-arrow" />
                </button>
              );
            })
          ) : (
            <div className="search-empty">No workspace records match "{query}".</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="search-modal-footer">
          <span>
            Use <strong>↑↓</strong> to navigate, <strong>Enter</strong> to select, <strong>ESC</strong> to close
          </span>
          <span>
            Role: <strong>{userRole}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
