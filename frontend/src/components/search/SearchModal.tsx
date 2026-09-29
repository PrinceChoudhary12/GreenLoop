import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userRole = user?.role || 'CITIZEN';

  // Filter actions based on role and query
  const filteredActions = QUICK_ACTIONS.filter(action => {
    if (!action.roles.includes(userRole)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return action.title.toLowerCase().includes(q) || action.subtitle.toLowerCase().includes(q);
  });

  const handleSelect = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="search-modal-card" onClick={e => e.stopPropagation()}>
        {/* Input Bar */}
        <div className="search-input-header">
          <Search size={20} className="modal-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="modal-search-input"
            placeholder="Search commands, reports, pickups, settings..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search platform navigation and commands"
          />
          <button className="search-close-btn" onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </div>

        {/* Notice */}
        <div className="search-privacy-notice">
          <Shield size={14} />
          <span>Search connects directly to your authorized role-based workspace data.</span>
        </div>

        {/* Results / Navigation List */}
        <div className="search-results-list">
          {filteredActions.length === 0 ? (
            <div className="search-empty">No commands or actions found for "{query}".</div>
          ) : (
            filteredActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className="search-result-item"
                  onClick={() => handleSelect(action.to)}
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
          )}
        </div>

        {/* Footer */}
        <div className="search-modal-footer">
          <span>Press <strong>ESC</strong> to close</span>
          <span>Role: <strong>{userRole}</strong></span>
        </div>
      </div>
    </div>
  );
};
