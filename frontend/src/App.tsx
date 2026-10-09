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
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { ActivityPage } from './pages/activity/ActivityPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { HelpPage } from './pages/help/HelpPage';
import { MapPage } from './pages/map/MapPage';
import { RewardsPage } from './pages/rewards/RewardsPage';
import { RecyclingCenters } from './pages/citizen/RecyclingCenters';
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
            <Layout systemStatus={systemStatus}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout systemStatus={systemStatus}>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout systemStatus={systemStatus}>
              <ReportDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pickups"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout systemStatus={systemStatus}>
              <Pickups />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-waste"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN']}>
            <Layout systemStatus={systemStatus}>
              <ReportWaste />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collector"
        element={
          <ProtectedRoute allowedRoles={['COLLECTOR']}>
            <Layout systemStatus={systemStatus}>
              <CollectorDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <AdminAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <NotificationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <ActivityPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <MessagesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <MapPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recycling-centers"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <RecyclingCenters />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rewards"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <RewardsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/help"
        element={
          <Layout systemStatus={systemStatus}>
            <HelpPage />
          </Layout>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['CITIZEN', 'COLLECTOR', 'ADMIN']}>
            <Layout systemStatus={systemStatus}>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
