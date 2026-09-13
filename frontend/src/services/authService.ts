import type { TokenResponse, User } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const authService = {
  async register(payload: {
    name: string;
    email: string;
    password: string;
    password_confirm: string;
  }): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Registration failed. Please try again.';
      throw new Error(msg);
    }
    return data as TokenResponse;
  },

  async registerCollector(payload: {
    name: string;
    email: string;
    password: string;
    password_confirm: string;
  }): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/register/collector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Collector registration failed. Please try again.';
      throw new Error(msg);
    }
    return data as TokenResponse;
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || 'Login failed. Please check your credentials.';
      throw new Error(msg);
    }
    return data as TokenResponse;
  },

  async getMe(token: string): Promise<User> {
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Session expired. Please log in again.');
    return response.json();
  },
};
