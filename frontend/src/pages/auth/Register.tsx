import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { authService } from '../../services/authService';
import './Auth.css';

interface FormState {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }
  if (!form.email.trim() || !/^[\w.+-]+@([\w-]+\.)+[a-zA-Z]{2,}$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = 'Passwords do not match.';
  }
  return errors;
}

export const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'CITIZEN' | 'COLLECTOR'>('CITIZEN');
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', passwordConfirm: '' });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setLoading(true);
    setServerError(null);
    try {
      if (role === 'COLLECTOR') {
        const { access_token, user } = await authService.registerCollector({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirm: form.passwordConfirm,
        });
        login(access_token, user);
        navigate('/collector', { replace: true });
      } else {
        const { access_token, user } = await authService.register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirm: form.passwordConfirm,
        });
        login(access_token, user);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <Leaf size={24} aria-hidden="true" />
          </div>
          <span className="auth-brand-name">GreenLoop</span>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join GreenLoop and make a difference</p>
        </div>

        {serverError && (
          <div className="auth-error" role="alert" aria-live="assertive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="role-selector-group">
            <label className="form-label">I want to join as</label>
            <div className="role-options">
              <button
                type="button"
                className={`role-option-btn ${role === 'CITIZEN' ? 'active' : ''}`}
                onClick={() => setRole('CITIZEN')}
              >
                <span className="role-option-title">Citizen</span>
                <span className="role-option-desc">Report waste & track collection</span>
              </button>
              <button
                type="button"
                className={`role-option-btn ${role === 'COLLECTOR' ? 'active' : ''}`}
                onClick={() => setRole('COLLECTOR')}
              >
                <span className="role-option-title">Waste Collector</span>
                <span className="role-option-desc">Claim & resolve pickups</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Full name</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
              disabled={loading}
              className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p id="name-error" className="field-error" role="alert">{fieldErrors.name}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email address</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={loading}
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && <p id="email-error" className="field-error" role="alert">{fieldErrors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <div className="input-with-action">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                required
                disabled={loading}
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p id="password-error" className="field-error" role="alert">{fieldErrors.password}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password-confirm" className="form-label">Confirm password</label>
            <input
              id="reg-password-confirm"
              name="passwordConfirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              disabled={loading}
              className={`form-input ${fieldErrors.passwordConfirm ? 'input-error' : ''}`}
              aria-describedby={fieldErrors.passwordConfirm ? 'confirm-error' : undefined}
              aria-invalid={!!fieldErrors.passwordConfirm}
            />
            {fieldErrors.passwordConfirm && <p id="confirm-error" className="field-error" role="alert">{fieldErrors.passwordConfirm}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
