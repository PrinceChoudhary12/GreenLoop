import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { fetchHealth } from './services/api';
import type { HealthResponse } from './types/health';

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
    loadHealth();
  }, [loadHealth]);

  const systemStatus = loading
    ? 'connecting'
    : error
    ? 'error'
    : health?.status || 'unhealthy';

  return (
    <Layout systemStatus={systemStatus}>
      <Home
        health={health}
        loading={loading}
        error={error}
        onRefresh={loadHealth}
      />
    </Layout>
  );
};

export default App;
