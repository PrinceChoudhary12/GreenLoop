import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import type { HealthStatus } from '../../types/health';
import './Header.css';

interface HeaderProps {
  systemStatus?: HealthStatus | 'connecting' | 'error';
}

export const Header: React.FC<HeaderProps> = ({ systemStatus }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header" role="banner">
      <div className="header-container">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo-link" aria-label="GreenLoop Home">
          <div className="logo-icon">
            <Leaf size={20} aria-hidden="true" />
          </div>
          <span className="logo-text">Green<span>Loop</span></span>
        </Link>

        {isAuthenticated ? (
          <>
            <nav className={`citizen-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Citizen Navigation">
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>My Reports</NavLink>
              <NavLink to="/report-waste" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMenuOpen(false)}>Report Waste</NavLink>
            </nav>
            <div className="header-actions">
              <span className="user-greeting" aria-label={`Logged in as ${user?.name}`}>
                {user?.name?.split(' ')[0]}
              </span>
              <button className="logout-btn" onClick={handleLogout} aria-label="Log out">
                <LogOut size={16} aria-hidden="true" />
                <span>Logout</span>
              </button>
              <button
                className="menu-toggle"
                onClick={() => setMenuOpen(m => !m)}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </>
        ) : (
          <div className="header-actions">
            {systemStatus && (
              <StatusBadge status={systemStatus} label={systemStatus === 'healthy' ? 'API Online' : undefined} />
            )}
            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        )}
      </div>
    </header>
  );
};
