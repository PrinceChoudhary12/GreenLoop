import React, { useState } from 'react';
import {
  User,
  Palette,
  Bell,
  Shield,
  Moon,
  Sun,
  Laptop,
  Check,
  LogOut,
  Sliders,
  Mail,
  Calendar,
  Lock,
  Sparkles,
  Eye,
  Trees,
  Waves,
  Flame,
  Contrast,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useTheme, type ThemeId, type WallpaperId } from '../../context/useTheme';
import { StatusBadge } from '../../components/common/StatusBadge';
import './SettingsPage.css';

type SettingsTab = 'account' | 'appearance' | 'notifications' | 'privacy' | 'security' | 'accessibility';

interface ThemeCardData {
  id: ThemeId;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colors: string[];
}

const THEME_OPTIONS: ThemeCardData[] = [
  {
    id: 'system',
    name: 'System Default',
    description: 'Syncs automatically with your operating system color scheme',
    icon: Laptop,
    colors: ['#2d6a4f', '#1e293b', '#f8faf9'],
  },
  {
    id: 'light',
    name: 'GreenLoop Light',
    description: 'Clean nature-inspired emerald style with high readability',
    icon: Sun,
    colors: ['#2d6a4f', '#d8f3dc', '#ffffff'],
  },
  {
    id: 'dark',
    name: 'GreenLoop Dark',
    description: 'Dark green moss & emerald palette for low-light environments',
    icon: Moon,
    colors: ['#40916c', '#1a3329', '#0c1813'],
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    description: 'Rich canopy green with deep botanical pine backgrounds',
    icon: Trees,
    colors: ['#10b981', '#143828', '#081a12'],
  },
  {
    id: 'ocean',
    name: 'Ocean Marine',
    description: 'Coastal eco-blue & cyan tones inspired by marine ecosystems',
    icon: Waves,
    colors: ['#0284c7', '#152f4c', '#081726'],
  },
  {
    id: 'midnight',
    name: 'Midnight Obsidian',
    description: 'High-tech slate obsidian with striking neon emerald accents',
    icon: Sparkles,
    colors: ['#10b981', '#1e293b', '#090d16'],
  },
  {
    id: 'warm-earth',
    name: 'Warm Earth',
    description: 'Terracotta clay and warm organic sage botanical tones',
    icon: Flame,
    colors: ['#7c4d32', '#f5e8df', '#fcf9f5'],
  },
  {
    id: 'high-contrast',
    name: 'High Contrast (WCAG AAA)',
    description: 'Maximum contrast monochrome with high-visibility neon lime',
    icon: Contrast,
    colors: ['#00ff66', '#ffffff', '#000000'],
  },
];

interface WallpaperOption {
  id: WallpaperId;
  name: string;
  description: string;
}

const WALLPAPER_OPTIONS: WallpaperOption[] = [
  { id: 'none', name: 'Clean Solid', description: 'Default flat surface' },
  { id: 'subtle-gradient', name: 'Subtle Radial', description: 'Soft radiant eco-glow' },
  { id: 'eco-pattern', name: 'Eco Geometry', description: 'Micro-geometric leaf weave' },
  { id: 'leaf-grid', name: 'Modular Grid', description: 'Technical clean coordinate grid' },
  { id: 'mesh-glow', name: 'Ambient Mesh', description: 'Soft blurred multi-point ambient' },
  { id: 'minimal-dots', name: 'Minimal Dots', description: 'Subtle matrix dots' },
];

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    preferences,
    setTheme,
    setWallpaper,
    setDensity,
    setAnimation,
    setBorderRadius,
    setSidebarMode,
    resetToDefaults,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [pickupAlerts, setPickupAlerts] = useState<boolean>(true);
  const [reportUpdates, setReportUpdates] = useState<boolean>(true);
  const [locationSharing, setLocationSharing] = useState<boolean>(() => {
    return localStorage.getItem('greenloop_location_consent') === 'true';
  });

  const handleLocationToggle = (checked: boolean) => {
    setLocationSharing(checked);
    localStorage.setItem('greenloop_location_consent', String(checked));
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
        <h1 className="settings-title">Platform Settings & Appearance Studio</h1>
        <p className="settings-subtitle">
          Customize themes, wallpapers, density, account preferences, and privacy controls.
        </p>
      </div>

      <div className="settings-layout">
        {/* Navigation Tabs */}
        <nav className="settings-nav" aria-label="Settings categories">
          <button
            className={`settings-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} />
            <span>Appearance Studio</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <User size={18} />
            <span>Account Profile</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Eye size={18} />
            <span>Privacy & Consent</span>
          </button>
          <button
            className={`settings-nav-btn ${activeTab === 'accessibility' ? 'active' : ''}`}
            onClick={() => setActiveTab('accessibility')}
          >
            <Sliders size={18} />
            <span>Accessibility</span>
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
          {/* TAB 1: Appearance Studio */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="section-header-wrap">
                <div>
                  <h2 className="section-title">Appearance Studio</h2>
                  <p className="section-desc">
                    Personalize themes, wallpapers, interface density, and animation speeds.
                  </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={resetToDefaults}>
                  Reset Defaults
                </button>
              </div>

              {/* 1. Theme Selection */}
              <div className="settings-card">
                <h3 className="card-subhead">Visual Theme</h3>
                <div className="theme-options-grid">
                  {THEME_OPTIONS.map(theme => {
                    const Icon = theme.icon;
                    const isSelected = preferences.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        className={`theme-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setTheme(theme.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="theme-card-top-row">
                          <div className="theme-swatch-group">
                            {theme.colors.map((c, i) => (
                              <span key={i} className="theme-swatch" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <Icon size={18} className="theme-card-icon" />
                        </div>

                        <div className="theme-card-info">
                          <strong>{theme.name}</strong>
                          <span>{theme.description}</span>
                        </div>

                        {isSelected && <Check size={16} className="selected-check" />}
                      </button>
                    );
                  })}
                </div>

                <div className="settings-divider" />

                {/* 2. Wallpaper Selection */}
                <h3 className="card-subhead">Background Wallpaper & Texture</h3>
                <div className="wallpaper-grid">
                  {WALLPAPER_OPTIONS.map(wp => {
                    const isSelected = preferences.wallpaper === wp.id;
                    return (
                      <button
                        key={wp.id}
                        className={`wallpaper-tile ${isSelected ? 'selected' : ''}`}
                        onClick={() => setWallpaper(wp.id)}
                        aria-pressed={isSelected}
                      >
                        <span className="wallpaper-name">{wp.name}</span>
                        <span className="wallpaper-desc">{wp.description}</span>
                        {isSelected && <Check size={14} className="selected-check" />}
                      </button>
                    );
                  })}
                </div>

                <div className="settings-divider" />

                {/* 3. Controls: Density, Radius, Animation, Sidebar */}
                <div className="appearance-controls-grid">
                  <div className="control-column">
                    <h4 className="control-title">Interface Density</h4>
                    <div className="segmented-control">
                      <button
                        className={`segment-btn ${preferences.density === 'comfortable' ? 'active' : ''}`}
                        onClick={() => setDensity('comfortable')}
                      >
                        Comfortable
                      </button>
                      <button
                        className={`segment-btn ${preferences.density === 'compact' ? 'active' : ''}`}
                        onClick={() => setDensity('compact')}
                      >
                        Compact
                      </button>
                    </div>
                  </div>

                  <div className="control-column">
                    <h4 className="control-title">Border Radius</h4>
                    <div className="segmented-control">
                      <button
                        className={`segment-btn ${preferences.borderRadius === 'sharp' ? 'active' : ''}`}
                        onClick={() => setBorderRadius('sharp')}
                      >
                        Sharp (4px)
                      </button>
                      <button
                        className={`segment-btn ${preferences.borderRadius === 'medium' ? 'active' : ''}`}
                        onClick={() => setBorderRadius('medium')}
                      >
                        Medium (10px)
                      </button>
                      <button
                        className={`segment-btn ${preferences.borderRadius === 'rounded' ? 'active' : ''}`}
                        onClick={() => setBorderRadius('rounded')}
                      >
                        Rounded (16px)
                      </button>
                    </div>
                  </div>

                  <div className="control-column">
                    <h4 className="control-title">Animations</h4>
                    <div className="segmented-control">
                      <button
                        className={`segment-btn ${preferences.animation === 'full' ? 'active' : ''}`}
                        onClick={() => setAnimation('full')}
                      >
                        Full Motion
                      </button>
                      <button
                        className={`segment-btn ${preferences.animation === 'reduced' ? 'active' : ''}`}
                        onClick={() => setAnimation('reduced')}
                      >
                        Reduced Motion
                      </button>
                    </div>
                  </div>

                  <div className="control-column">
                    <h4 className="control-title">Default Sidebar</h4>
                    <div className="segmented-control">
                      <button
                        className={`segment-btn ${preferences.sidebarMode === 'expanded' ? 'active' : ''}`}
                        onClick={() => setSidebarMode('expanded')}
                      >
                        Expanded
                      </button>
                      <button
                        className={`segment-btn ${preferences.sidebarMode === 'collapsed' ? 'active' : ''}`}
                        onClick={() => setSidebarMode('collapsed')}
                      >
                        Collapsed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="settings-divider" />

                {/* 4. Live Appearance Preview Panel */}
                <h3 className="card-subhead">Live Appearance Preview</h3>
                <div className="appearance-preview-box">
                  <div className="preview-row">
                    <button className="btn btn-primary btn-sm">Primary Button</button>
                    <button className="btn btn-ghost btn-sm">Ghost Button</button>
                    <StatusBadge status="healthy" />
                  </div>
                  <div className="preview-input-row">
                    <input
                      type="text"
                      className="form-input preview-input"
                      placeholder="Input preview focus style..."
                      readOnly
                      value="GreenLoop Design System 2.0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Account Profile */}
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

                  <div className="field-group">
                    <label className="field-label">Account Status</label>
                    <div className="field-value">
                      <CheckCircle size={14} style={{ color: '#10b981' }} />
                      Verified Active
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2 className="section-title">Notification Preferences</h2>
              <p className="section-desc">Configure in-app and dispatch alerts for report lifecycles and pickups.</p>

              <div className="settings-card">
                <div className="toggle-row">
                  <div className="toggle-text">
                    <strong>Pickup Status & Dispatch Alerts</strong>
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
                    <strong>Waste Report Lifecycle Updates</strong>
                    <span>Receive notifications when submitted reports change status or are claimed.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="custom-toggle"
                    checked={reportUpdates}
                    onChange={e => setReportUpdates(e.target.checked)}
                    aria-label="Toggle waste report lifecycle updates"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Privacy & Consent */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2 className="section-title">Privacy & Consent Controls</h2>
              <p className="section-desc">Manage live location sharing and data privacy preferences.</p>

              <div className="settings-card">
                <div className="toggle-row">
                  <div className="toggle-text">
                    <strong>Live Location Sharing Consent</strong>
                    <span>
                      Allow GreenLoop to use your device location for waste report mapping and collector routing.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    className="custom-toggle"
                    checked={locationSharing}
                    onChange={e => handleLocationToggle(e.target.checked)}
                    aria-label="Toggle live location sharing consent"
                  />
                </div>

                <div className="settings-divider" />

                <div className="privacy-notice-box">
                  <Shield size={18} className="shield-icon" />
                  <span>
                    GreenLoop does not continuously track users. Location sharing is opt-in, strictly context-driven for dispatches, and revocable at any time.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Accessibility */}
          {activeTab === 'accessibility' && (
            <div className="settings-section">
              <h2 className="section-title">Accessibility & Usability</h2>
              <p className="section-desc">High-contrast visual modes, keyboard navigation, and reduced motion.</p>

              <div className="settings-card">
                <div className="accessibility-item">
                  <strong>High Contrast Mode</strong>
                  <p>Enables maximum contrast monochrome surfaces with high-visibility neon lime indicators.</p>
                  <button
                    className={`btn btn-sm ${preferences.theme === 'high-contrast' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTheme(preferences.theme === 'high-contrast' ? 'light' : 'high-contrast')}
                  >
                    {preferences.theme === 'high-contrast' ? 'High Contrast: Active' : 'Enable High Contrast'}
                  </button>
                </div>

                <div className="settings-divider" />

                <div className="accessibility-item">
                  <strong>Reduced Motion</strong>
                  <p>Disables all decorative transitions, sliding animations, and pulsating elements.</p>
                  <button
                    className={`btn btn-sm ${preferences.animation === 'reduced' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAnimation(preferences.animation === 'reduced' ? 'full' : 'reduced')}
                  >
                    {preferences.animation === 'reduced' ? 'Reduced Motion: Active' : 'Enable Reduced Motion'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Security */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2 className="section-title">Security & Session</h2>
              <p className="section-desc">Manage session authentication and security settings.</p>

              <div className="settings-card">
                <div className="security-item">
                  <div className="security-info">
                    <Lock size={20} className="security-icon" />
                    <div>
                      <strong>Active JWT Session</strong>
                      <span>Secured token-based session for authenticated platform operations.</span>
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
