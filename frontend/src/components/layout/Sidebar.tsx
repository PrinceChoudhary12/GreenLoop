import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Leaf,
  LayoutDashboard,
  FileText,
  Truck,
  PlusCircle,
  BarChart3,
  ShieldCheck,
  Bell,
  Activity,
  MessageSquare,
  Award,
  MapPin,
  Building2,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unreadCount?: number;
}

interface NavItemConfig {
  label: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  highlight?: boolean;
  end?: boolean;
}

interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  unreadCount = 0,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onCloseMobile();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'GL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Build role-aware navigation groups
  const getNavGroups = (): NavGroupConfig[] => {
    const role = user?.role;

    const coreItems: NavItemConfig[] = [];

    if (role === 'ADMIN') {
      coreItems.push(
        { label: 'Command Center', to: '/admin', icon: ShieldCheck, end: true },
        { label: 'Analytics Studio', to: '/admin/analytics', icon: BarChart3, highlight: true },
        { label: 'All Reports', to: '/reports', icon: FileText },
        { label: 'Pickups Fleet', to: '/pickups', icon: Truck },
      );
    } else if (role === 'COLLECTOR') {
      coreItems.push(
        { label: 'Collector Ops', to: '/collector', icon: LayoutDashboard, end: true },
        { label: 'Pickups Queue', to: '/pickups', icon: Truck, highlight: true },
        { label: 'Nearby Reports', to: '/reports', icon: FileText },
      );
    } else {
      // CITIZEN or unauthenticated fallback
      coreItems.push(
        { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
        { label: 'Report Waste', to: '/report-waste', icon: PlusCircle, highlight: true },
        { label: 'My Reports', to: '/reports', icon: FileText },
        { label: 'My Pickups', to: '/pickups', icon: Truck },
      );
    }

    const platformItems: NavItemConfig[] = [
      { label: 'Live Map', to: '/map', icon: MapPin },
      { label: 'Recycling Centers', to: '/centers', icon: Building2 },
      {
        label: 'Notifications',
        to: '/notifications',
        icon: Bell,
        badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
      },
      { label: 'Activity Log', to: '/activity', icon: Activity },
      { label: 'Messages', to: '/messages', icon: MessageSquare },
      { label: 'Eco Rewards', to: '/rewards', icon: Award },
    ];

    const systemItems: NavItemConfig[] = [
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Help & Support', to: '/help', icon: HelpCircle },
    ];

    return [
      { title: 'Core Workspace', items: coreItems },
      { title: 'Platform & Community', items: platformItems },
      { title: 'System', items: systemItems },
    ];
  };

  const navGroups = getNavGroups();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <NavLink
            to={isAuthenticated ? (user?.role === 'ADMIN' ? '/admin' : user?.role === 'COLLECTOR' ? '/collector' : '/dashboard') : '/'}
            className="sidebar-brand"
            onClick={onCloseMobile}
            title="GreenLoop Home"
          >
            <div className="sidebar-logo-icon">
              <Leaf size={20} className="brand-leaf" />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-info">
                <span className="sidebar-brand-title">GreenLoop</span>
                <span className="sidebar-brand-badge">v2.0</span>
              </div>
            )}
          </NavLink>

          {/* Mobile close button */}
          <button
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close navigation sidebar"
          >
            <X size={20} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            className="sidebar-collapse-btn desktop-only"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Groupings */}
        <div className="sidebar-nav-container">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="sidebar-nav-group">
              {!collapsed && <div className="sidebar-group-title">{group.title}</div>}
              <ul className="sidebar-nav-list">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <li key={itemIdx} className="sidebar-nav-item">
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `sidebar-nav-link ${isActive ? 'active' : ''} ${
                            item.highlight ? 'highlight' : ''
                          }`
                        }
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="sidebar-nav-icon-wrap">
                          <Icon size={19} className="sidebar-nav-icon" />
                          {item.badge !== undefined && collapsed && (
                            <span className="sidebar-mini-badge" />
                          )}
                        </span>
                        {!collapsed && (
                          <span className="sidebar-nav-label">{item.label}</span>
                        )}
                        {!collapsed && item.badge !== undefined && (
                          <span className="sidebar-nav-badge">{item.badge}</span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* User Profile / Footer Section */}
        {isAuthenticated && user && (
          <div className="sidebar-footer">
            <div className="sidebar-user-card" title={`${user.name} (${user.role})`}>
              <div className="sidebar-avatar-wrap">
                <div className="sidebar-avatar">
                  {getInitials(user.name)}
                </div>
                <span className="sidebar-status-dot online" />
              </div>
              {!collapsed && (
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{user.name}</div>
                  <div className="sidebar-user-meta">
                    <span className={`sidebar-role-pill role-${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
              {!collapsed && (
                <button
                  className="sidebar-logout-btn"
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {!isAuthenticated && !collapsed && (
          <div className="sidebar-footer auth-actions">
            <NavLink to="/login" className="btn btn-ghost btn-sm w-full" onClick={onCloseMobile}>
              <UserIcon size={14} style={{ marginRight: '6px' }} />
              Log In
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
};
