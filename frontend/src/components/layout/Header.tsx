import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { StatusBadge } from '../common/StatusBadge';
import type { HealthStatus } from '../../types/health';
import './Header.css';

interface HeaderProps {
  systemStatus?: HealthStatus | 'connecting' | 'error';
}

export const Header: React.FC<HeaderProps> = ({ systemStatus }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="brand-logo" aria-label="GreenLoop Home">
          <div className="logo-icon-wrap" aria-hidden="true">
            <Leaf size={20} className="logo-leaf" />
          </div>
          <span className="brand-text">GreenLoop</span>
        </Link>

        {systemStatus && (
          <div className="system-status-indicator">
            <StatusBadge status={systemStatus} />
          </div>
        )}

        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`nav-menu ${menuOpen ? 'nav-open' : ''}`} aria-label="Main Navigation">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
            Overview
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Dashboard
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
                My Reports
              </NavLink>
              <NavLink to="/report-waste" className={({ isActive }) => `nav-link nav-highlight ${isActive ? 'nav-active' : ''}`} onClick={() => setMenuOpen(false)}>
                Report Waste
              </NavLink>
              <div className="user-profile-menu">
                <span className="user-greeting">Hi, {user?.name?.split(' ')[0]}</span>
                <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout} aria-label="Log out">
                  <LogOut size={14} aria-hidden="true" />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="auth-nav-actions">
              <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
