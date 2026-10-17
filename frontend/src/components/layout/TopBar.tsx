import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Plus,
  Moon,
  Sun,
  MessageSquare,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Palette,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { StatusBadge } from '../common/StatusBadge';
import { NotificationBell } from '../notifications/NotificationBell';
import type { HealthStatus } from '../../types/health';
import './TopBar.css';

interface TopBarProps {
  systemStatus?: HealthStatus | 'connecting' | 'error';
  onOpenMobileNav: () => void;
  onOpenSearch?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  systemStatus,
  onOpenMobileNav,
  onOpenSearch,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { setTheme, resolvedTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'GL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Derive contextual page title/breadcrumb from location
  const getPageContext = () => {
    const p = location.pathname;
    if (p === '/') return { section: 'Home', title: 'Platform Overview' };
    if (p === '/dashboard') return { section: 'Citizen', title: 'Command Center' };
    if (p === '/reports') return { section: 'Citizen', title: 'Waste Reports' };
    if (p.startsWith('/reports/')) return { section: 'Citizen', title: 'Report Details' };
    if (p === '/pickups') return { section: 'Citizen', title: 'My Pickups & Scheduling' };
    if (p === '/report-waste') return { section: 'Citizen', title: 'Report Waste Incident' };
    if (p === '/collector') return { section: 'Operations', title: 'Collector Workspace' };
    if (p === '/admin') return { section: 'Administration', title: 'Operations Command Center' };
    if (p === '/admin/analytics') return { section: 'Administration', title: 'Analytics & Impact Studio' };
    if (p === '/notifications') return { section: 'Communication', title: 'Notification Center' };
    if (p === '/activity') return { section: 'Platform', title: 'Activity Audit Stream' };
    if (p === '/messages') return { section: 'Communication', title: 'Messages & Dispatch' };
    if (p === '/map') return { section: 'Live Ops', title: 'Geospatial Waste Map' };
    if (p === '/centers') return { section: 'Facilities', title: 'Recycling Centers' };
    if (p === '/rewards') return { section: 'Community', title: 'Eco Points & Gamification' };
    if (p === '/settings') return { section: 'System', title: 'Platform Settings' };
    if (p === '/help') return { section: 'Support', title: 'Help & Knowledge Center' };
    return { section: 'Platform', title: 'GreenLoop' };
  };

  const pageContext = getPageContext();

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {/* Mobile menu hamburger */}
        <button
          className="topbar-icon-btn mobile-menu-toggle"
          onClick={onOpenMobileNav}
          aria-label="Open mobile navigation"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb / Page Title */}
        <div className="topbar-breadcrumbs">
          <span className="breadcrumb-section">{pageContext.section}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{pageContext.title}</span>
        </div>
      </div>

      <div className="topbar-center">
        {/* Global Search trigger bar */}
        <button
          className="topbar-search-bar"
          onClick={onOpenSearch}
          aria-label="Global search (Press Ctrl+K or Cmd+K)"
          title="Search anything across GreenLoop..."
        >
          <Search size={16} className="search-icon" />
          <span className="search-placeholder">Search reports, pickups, centers, analytics...</span>
          <kbd className="search-shortcut">⌘K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        {/* System status pill */}
        {systemStatus && (
          <div className="topbar-status-wrapper">
            <StatusBadge status={systemStatus} />
          </div>
        )}

        {/* Quick Create CTA (Citizens or authenticated users) */}
        {isAuthenticated && user?.role === 'CITIZEN' && (
          <Link to="/report-waste" className="topbar-quick-create-btn">
            <Plus size={16} />
            <span className="quick-create-text">Report Waste</span>
          </Link>
        )}

        {/* Messages shortcut */}
        {isAuthenticated && (
          <Link
            to="/messages"
            className="topbar-icon-btn topbar-msg-btn"
            title="Messages"
            aria-label="Messages"
          >
            <MessageSquare size={18} />
          </Link>
        )}

        {/* Notification Bell */}
        {isAuthenticated && (
          <div className="topbar-notification-wrap">
            <NotificationBell />
          </div>
        )}

        {/* Quick Theme Toggle */}
        <button
          className="topbar-icon-btn topbar-theme-btn"
          onClick={toggleTheme}
          title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle visual theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Profile Menu or Auth Actions */}
        {isAuthenticated && user ? (
          <div className="topbar-profile-container" ref={dropdownRef}>
            <button
              className={`topbar-avatar-btn ${profileDropdownOpen ? 'active' : ''}`}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-expanded={profileDropdownOpen}
              aria-label="User profile menu"
            >
              <div className="topbar-avatar">{getInitials(user.name)}</div>
              <div className="topbar-user-summary">
                <span className="topbar-user-name">{user.name.split(' ')[0]}</span>
                <span className="topbar-user-role">{user.role}</span>
              </div>
              <ChevronDown size={14} className="avatar-chevron" />
            </button>

            {profileDropdownOpen && (
              <div className="topbar-profile-dropdown" role="menu">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">{getInitials(user.name)}</div>
                  <div className="profile-dropdown-user">
                    <div className="profile-name">{user.name}</div>
                    <div className="profile-email">{user.email}</div>
                    <span className={`profile-role-badge role-${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="profile-dropdown-divider" />

                <div className="profile-dropdown-menu">
                  <Link
                    to="/settings"
                    className="profile-dropdown-item"
                    onClick={() => setProfileDropdownOpen(false)}
                    role="menuitem"
                  >
                    <User size={16} />
                    <span>My Profile & Account</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="profile-dropdown-item"
                    onClick={() => setProfileDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Palette size={16} />
                    <span>Appearance & Themes</span>
                  </Link>
                  <Link
                    to="/activity"
                    className="profile-dropdown-item"
                    onClick={() => setProfileDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Activity size={16} />
                    <span>Activity Stream</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="profile-dropdown-item"
                    onClick={() => setProfileDropdownOpen(false)}
                    role="menuitem"
                  >
                    <Settings size={16} />
                    <span>System Settings</span>
                  </Link>
                </div>

                <div className="profile-dropdown-divider" />

                <button
                  className="profile-dropdown-item logout-action"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="topbar-auth-links">
            <Link to="/login" className="btn btn-ghost btn-sm">
              Log In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
