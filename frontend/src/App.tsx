import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Dashboard } from './pages/citizen/Dashboard';
import { Reports } from './pages/citizen/Reports';
import { Pickups } from './pages/citizen/Pickups';
import { ReportWaste } from './pages/citizen/ReportWaste';
import { ReportDetail } from './pages/citizen/ReportDetail';
import { CollectorDashboard } from './pages/collector/CollectorDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { fetchHealth } from './services/api';
import type { HealthResponse, HealthStatus } from './types/health';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchHealth()
      .then(data => {
        if (isMounted) {
          setHealth(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch health status');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const systemStatus: HealthStatus | 'connecting' | 'error' = loading
    ? 'connecting'
    : error
    ? 'error'
    : health?.status || 'unhealthy';

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout systemStatus={systemStatus}>
            <Home
              health={health}
              loading={loading}
              error={error}
              onRefresh={loadHealth}
            />
          </Layout>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout>
              <ReportDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pickups"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout>
              <Pickups />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-waste"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout>
              <ReportWaste />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collector"
        element={
          <ProtectedRoute allowedRoles={['COLLECTOR']}>
            <Layout>
              <CollectorDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout>
              <NotificationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
