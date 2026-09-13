import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import type { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen" aria-live="polite">
        <div className="auth-loading-spinner" />
        <p>Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'COLLECTOR') {
      return <Navigate to="/collector" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
