import React, { useState } from 'react';
import {
  User,
  Palette,
  Bell,
  Shield,
  Moon,
  Sun,
  Check,
  LogOut,
  Sliders,
  Mail,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import './SettingsPage.css';

type SettingsTab = 'account' | 'appearance' | 'notifications' | 'security';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('greenloop_theme') as 'light' | 'dark') || 'light';
  });

  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('greenloop_density') as 'comfortable' | 'compact') || 'comfortable';
  });

  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [pickupAlerts, setPickupAlerts] = useState<boolean>(true);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setCurrentTheme(newTheme);
    localStorage.setItem('greenloop_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleDensityChange = (newDensity: 'comfortable' | 'compact') => {
    setDensity(newDensity);
    localStorage.setItem('greenloop_density', newDensity);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="settings-page-container">
      {/* Page Header */}
      <div className="settings-header">
        <h1 className="settings-title">Platform Settings</h1>
        <p className="settings-subtitle">Manage your account profile, visual appearance, and system preferences.</p>
      </div>

      <div className="settings-layout">
        {/* Navigation Tabs */}
        <nav className="settings-nav" aria-label="Settings categories">
          <button
            className={`settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <User size={18} />
            <span>Account Profile</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} />
            <span>Appearance & Themes</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            <span>Notification Preferences</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} />
            <span>Security & Sessions</span>
          </button>
        </nav>

        {/* Content Pane */}
        <div className="settings-content-pane">
          {/* TAB 1: Account */}
          {activeTab === 'account' && (
            <div className="settings-section">
              <h2 className="section-title">Account Profile</h2>
              <p className="section-desc">Your verified account information and platform permissions.</p>

              <div className="settings-card">
                <div className="profile-hero">
                  <div className="profile-large-avatar">
                    {user?.name?.slice(0, 2).toUpperCase() || 'GL'}
                  </div>
                  <div className="profile-hero-details">
                    <h3>{user?.name}</h3>
                    <span className={`role-badge role-${user?.role.toLowerCase()}`}>
                      {user?.role} Workspace
                    </span>
                  </div>
                </div>

                <div className="profile-fields-grid">
                  <div className="field-group">
                    <label className="field-label">Full Name</label>
                    <div className="field-value">{user?.name}</div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Email Address</label>
                    <div className="field-value">
                      <Mail size={14} className="inline-icon" />
                      {user?.email}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Account Role</label>
                    <div className="field-value">{user?.role}</div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Member Since</label>
                    <div className="field-value">
                      <Calendar size={14} className="inline-icon" />
                      {formatDate(user?.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Appearance */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2 className="section-title">Appearance & Themes</h2>
              <p className="section-desc">Customize how GreenLoop looks and feels on your device.</p>

              <div className="settings-card">
                <h3 className="card-subhead">Visual Theme</h3>
                <div className="theme-options-grid">
                  <button
                    className={`theme-card ${currentTheme === 'light' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="theme-preview light-preview">
                      <Sun size={24} className="theme-icon-light" />
                    </div>
                    <div className="theme-card-info">
                      <strong>Light Theme</strong>
                      <span>Clean nature-inspired emerald style</span>
                    </div>
                    {currentTheme === 'light' && <Check size={18} className="selected-check" />}
                  </button>

                  <button
                    className={`theme-card ${currentTheme === 'dark' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="theme-preview dark-preview">
                      <Moon size={24} className="theme-icon-dark" />
                    </div>
                    <div className="theme-card-info">
                      <strong>Dark Theme</strong>
                      <span>High contrast, dark green sleek aesthetic</span>
                    </div>
                    {currentTheme === 'dark' && <Check size={18} className="selected-check" />}
                  </button>
                </div>

                <div className="settings-divider" />

                <h3 className="card-subhead">Workspace Density</h3>
                <div className="density-toggle-group">
                  <button
                    className={`density-btn ${density === 'comfortable' ? 'active' : ''}`}
                    onClick={() => handleDensityChange('comfortable')}
                  >
                    <Sliders size={16} />
                    <span>Comfortable</span>
                  </button>
                  <button
                    className={`density-btn ${density === 'compact' ? 'active' : ''}`}
                    onClick={() => handleDensityChange('compact')}
                  >
                    <Sliders size={16} />
                    <span>Compact</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2 className="section-title">Notification Preferences</h2>
              <p className="section-desc">Configure in-app and system alerts for report dispatches and pickups.</p>

              <div className="settings-card">
                <div className="toggle-row">
                  <div className="toggle-text">
                    <strong>Pickup Status Alerts</strong>
                    <span>Receive instant alerts when a collector is assigned or completes a pickup.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="custom-toggle"
                    checked={pickupAlerts}
                    onChange={e => setPickupAlerts(e.target.checked)}
                    aria-label="Toggle pickup status alerts"
                  />
                </div>

                <div className="settings-divider" />

                <div className="toggle-row">
                  <div className="toggle-text">
                    <strong>Platform Audit & Activity Notifications</strong>
                    <span>Receive notifications when waste reports change lifecycle state.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="custom-toggle"
                    checked={emailNotifications}
                    onChange={e => setEmailNotifications(e.target.checked)}
                    aria-label="Toggle platform activity notifications"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Security */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2 className="section-title">Security & Session</h2>
              <p className="section-desc">Manage session authentication and security settings.</p>

              <div className="settings-card">
                <div className="security-item">
                  <div className="security-info">
                    <Lock size={20} className="security-icon" />
                    <div>
                      <strong>Session Authentication</strong>
                      <span>Active JWT session token for authenticated operations.</span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm logout-btn" onClick={logout}>
                    <LogOut size={14} />
                    <span>Sign Out Current Session</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
