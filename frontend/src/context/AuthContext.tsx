import React, { useCallback, useEffect, useState } from 'react';
import type { AuthState, User } from '../types/auth';
import { authService } from '../services/authService';
import { AuthContext } from './useAuth';

const TOKEN_KEY = 'greenloop_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    return {
      user: null,
      token: savedToken,
      isAuthenticated: false,
      isLoading: Boolean(savedToken),
    };
  });

  // Restore session from localStorage on app load
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;

    let isMounted = true;
    authService
      .getMe(savedToken)
      .then(user => {
        if (isMounted) {
          setState({ user, token: savedToken, isAuthenticated: true, isLoading: false });
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem(TOKEN_KEY);
          setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
