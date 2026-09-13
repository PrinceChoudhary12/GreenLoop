import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Dashboard } from './pages/citizen/Dashboard';
import { Reports } from './pages/citizen/Reports';
import { ReportWaste } from './pages/citizen/ReportWaste';
import { ReportDetail } from './pages/citizen/ReportDetail';
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
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-waste"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportWaste />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
