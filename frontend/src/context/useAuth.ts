import { createContext, useContext } from 'react';
import type { AuthState, User } from '../types/auth';

export interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  /** Update the authenticated user in context (e.g. after profile edit). */
  updateUser: (user: User) => void;
}

export interface OptionalAuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser?: (user: User) => void;
}

export const AuthContext = createContext<OptionalAuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return {
    ...ctx,
    updateUser: ctx.updateUser ?? (() => {}),
  };
}
