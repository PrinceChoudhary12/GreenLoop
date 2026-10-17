import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Lock,
  Palette,
  Bell,
  LogOut,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { authService } from '../../services/authService';
import './ProfilePage.css';

// ─── helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
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
}

function getInitials(name?: string): string {
  if (!name) return 'GL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Toast component ────────────────────────────────────────────────────────

interface ToastProps {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, message, onDismiss }) => (
  <div className={`profile-toast profile-toast--${type}`} role="alert">
    {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
    <span>{message}</span>
    <button className="profile-toast__close" onClick={onDismiss} aria-label="Dismiss">
      <X size={14} />
    </button>
  </div>
);

// ─── PasswordModal ──────────────────────────────────────────────────────────

interface PasswordModalProps {
  token: string;
  onSuccess: () => void;
  onClose: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ token, onSuccess, onClose }) => {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!form.current_password) return 'Current password is required.';
    if (form.new_password.length < 8) return 'New password must be at least 8 characters.';
    if (form.new_password !== form.new_password_confirm) return 'New passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      await authService.changePassword(token, form);
      onSuccess();
    } catch (ex: any) {
      setError(ex.message || 'Password change failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pw-modal-title">
      <div className="profile-modal">
        <div className="profile-modal__header">
          <h3 id="pw-modal-title">
            <Lock size={18} /> Change Password
          </h3>
          <button className="profile-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-modal__body" noValidate>
          {error && (
            <div className="profile-field-error profile-field-error--block">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Current password */}
          <div className="profile-form-field">
            <label className="profile-form-label" htmlFor="pw-current">Current Password</label>
            <div className="profile-pw-input-wrap">
              <input
                id="pw-current"
                type={show.current ? 'text' : 'password'}
                className="profile-form-input"
                value={form.current_password}
                onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
                autoComplete="current-password"
                disabled={saving}
              />
              <button
                type="button"
                className="profile-pw-toggle"
                onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                aria-label={show.current ? 'Hide password' : 'Show password'}
              >
                {show.current ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="profile-form-field">
            <label className="profile-form-label" htmlFor="pw-new">New Password</label>
            <div className="profile-pw-input-wrap">
              <input
                id="pw-new"
                type={show.newPw ? 'text' : 'password'}
                className="profile-form-input"
                value={form.new_password}
                onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                autoComplete="new-password"
                disabled={saving}
              />
              <button
                type="button"
                className="profile-pw-toggle"
                onClick={() => setShow(s => ({ ...s, newPw: !s.newPw }))}
                aria-label={show.newPw ? 'Hide password' : 'Show password'}
              >
                {show.newPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <span className="profile-form-hint">Minimum 8 characters.</span>
          </div>

          {/* Confirm new password */}
          <div className="profile-form-field">
            <label className="profile-form-label" htmlFor="pw-confirm">Confirm New Password</label>
            <div className="profile-pw-input-wrap">
              <input
                id="pw-confirm"
                type={show.confirm ? 'text' : 'password'}
                className="profile-form-input"
                value={form.new_password_confirm}
                onChange={e => setForm(f => ({ ...f, new_password_confirm: e.target.value }))}
                autoComplete="new-password"
                disabled={saving}
              />
              <button
                type="button"
                className="profile-pw-toggle"
                onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                aria-label={show.confirm ? 'Hide password' : 'Show password'}
              >
                {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="profile-modal__actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <><Loader2 size={14} className="spin" /> Changing…</> : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main ProfilePage ────────────────────────────────────────────────────────

export const ProfilePage: React.FC = () => {
  const { user, token, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Edit-name state
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password modal
  const [showPwModal, setShowPwModal] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleEditStart = () => {
    setNameInput(user?.name ?? '');
    setNameError(null);
    setEditing(true);
  };

  const handleEditCancel = () => {
    setEditing(false);
    setNameError(null);
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('Name must be 100 characters or less.');
      return;
    }
    setSaving(true);
    setNameError(null);
    try {
      const updated = await authService.updateProfile(token!, { name: trimmed });
      updateUser(updated);
      setEditing(false);
      showToast('success', 'Profile updated successfully.');
    } catch (ex: any) {
      showToast('error', ex.message || 'Profile update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const roleBadgeClass = `profile-role-badge profile-role-badge--${user?.role?.toLowerCase() ?? 'citizen'}`;

  return (
    <div className="profile-page">
      {/* Toast */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      {/* Password Modal */}
      {showPwModal && token && (
        <PasswordModal
          token={token}
          onSuccess={() => {
            setShowPwModal(false);
            showToast('success', 'Password changed successfully.');
          }}
          onClose={() => setShowPwModal(false)}
        />
      )}

      {/* Page header */}
      <div className="profile-page-header">
        <button
          className="profile-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 className="profile-page-title">My Profile &amp; Account</h1>
          <p className="profile-page-subtitle">Manage your personal information and security settings.</p>
        </div>
      </div>

      <div className="profile-page-body">
        {/* ── PROFILE HERO CARD ── */}
        <section className="profile-card profile-hero-card" aria-label="Profile header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" aria-hidden="true">
              {getInitials(user?.name)}
            </div>
            <div className="profile-avatar-status" title="Account active" />
          </div>
          <div className="profile-hero-info">
            <h2 className="profile-hero-name">{user?.name}</h2>
            <p className="profile-hero-email">
              <Mail size={14} /> {user?.email}
            </p>
            <div className="profile-hero-meta">
              <span className={roleBadgeClass}>{user?.role}</span>
              <span className="profile-hero-since">
                <Calendar size={13} /> Member since {formatDate(user?.created_at)}
              </span>
            </div>
          </div>
        </section>

        {/* ── PERSONAL INFORMATION ── */}
        <section className="profile-card" aria-label="Personal information">
          <div className="profile-card-header">
            <h3 className="profile-card-title">
              <User size={16} /> Personal Information
            </h3>
            {!editing && (
              <button
                id="profile-edit-btn"
                className="btn btn-ghost btn-sm"
                onClick={handleEditStart}
              >
                <Edit3 size={14} /> Edit
              </button>
            )}
          </div>

          <div className="profile-fields">
            {/* Full Name */}
            <div className="profile-field">
              <label className="profile-field-label" htmlFor="profile-name">Full Name</label>
              {editing ? (
                <div className="profile-edit-row">
                  <input
                    id="profile-name"
                    type="text"
                    className={`profile-form-input ${nameError ? 'profile-form-input--error' : ''}`}
                    value={nameInput}
                    onChange={e => { setNameInput(e.target.value); setNameError(null); }}
                    maxLength={100}
                    disabled={saving}
                    autoFocus
                    aria-describedby={nameError ? 'profile-name-error' : undefined}
                  />
                  {nameError && (
                    <span id="profile-name-error" className="profile-field-error">
                      <AlertCircle size={13} /> {nameError}
                    </span>
                  )}
                  <div className="profile-edit-actions">
                    <button
                      id="profile-save-btn"
                      className="btn btn-primary btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? <><Loader2 size={14} className="spin" /> Saving…</> : <><CheckCircle size={14} /> Save</>}
                    </button>
                    <button
                      id="profile-cancel-btn"
                      className="btn btn-ghost btn-sm"
                      onClick={handleEditCancel}
                      disabled={saving}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-field-value">{user?.name}</div>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="profile-field">
              <label className="profile-field-label">Email Address</label>
              <div className="profile-field-value">
                <Mail size={14} className="profile-field-icon" /> {user?.email}
              </div>
              <span className="profile-field-note">
                Email changes require identity verification and are not available in this release.
              </span>
            </div>
          </div>
        </section>

        {/* ── ACCOUNT INFORMATION ── */}
        <section className="profile-card" aria-label="Account information">
          <div className="profile-card-header">
            <h3 className="profile-card-title">
              <Shield size={16} /> Account Information
            </h3>
          </div>
          <div className="profile-fields profile-fields--readonly">
            <div className="profile-field">
              <label className="profile-field-label">Account Role</label>
              <div className="profile-field-value">
                <span className={roleBadgeClass}>{user?.role}</span>
              </div>
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Account Status</label>
              <div className="profile-field-value">
                <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                &nbsp;Verified &amp; Active
              </div>
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Member Since</label>
              <div className="profile-field-value">
                <Calendar size={14} className="profile-field-icon" />
                {formatDate(user?.created_at)}
              </div>
            </div>
          </div>
        </section>

        {/* ── PREFERENCES SHORTCUTS ── */}
        <section className="profile-card" aria-label="Preferences shortcuts">
          <div className="profile-card-header">
            <h3 className="profile-card-title">
              <Palette size={16} /> Preferences
            </h3>
          </div>
          <div className="profile-shortcuts">
            <button
              className="profile-shortcut-btn"
              onClick={() => navigate('/settings')}
              id="profile-appearance-shortcut"
            >
              <Palette size={18} />
              <span>
                <strong>Appearance Studio</strong>
                <small>Themes, wallpapers, density &amp; animations</small>
              </span>
            </button>
            <button
              className="profile-shortcut-btn"
              onClick={() => navigate('/settings')}
              id="profile-notifications-shortcut"
            >
              <Bell size={18} />
              <span>
                <strong>Notification Preferences</strong>
                <small>Pickup alerts &amp; report lifecycle updates</small>
              </span>
            </button>
          </div>
        </section>

        {/* ── SECURITY ── */}
        <section className="profile-card" aria-label="Security settings">
          <div className="profile-card-header">
            <h3 className="profile-card-title">
              <Lock size={16} /> Security
            </h3>
          </div>
          <div className="profile-security-list">
            <div className="profile-security-item">
              <div className="profile-security-item__info">
                <Lock size={16} className="profile-security-item__icon" />
                <div>
                  <strong>Password</strong>
                  <span>Update your account password</span>
                </div>
              </div>
              <button
                id="profile-change-password-btn"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPwModal(true)}
              >
                Change Password
              </button>
            </div>

            <div className="profile-security-divider" />

            <div className="profile-security-item">
              <div className="profile-security-item__info">
                <Shield size={16} className="profile-security-item__icon" />
                <div>
                  <strong>Active Session</strong>
                  <span>JWT token-based authenticated session</span>
                </div>
              </div>
              <button
                id="profile-logout-btn"
                className="btn btn-ghost btn-sm profile-logout-btn"
                onClick={() => { logout(); navigate('/login'); }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>

            <div className="profile-security-divider" />

            <div className="profile-security-item profile-security-item--disabled">
              <div className="profile-security-item__info">
                <AlertCircle size={16} className="profile-security-item__icon" />
                <div>
                  <strong>Account Deactivation</strong>
                  <span>Requires identity verification — coming in a future release</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" disabled>
                Coming Soon
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
