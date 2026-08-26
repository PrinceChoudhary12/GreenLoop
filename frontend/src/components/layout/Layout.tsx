import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import type { HealthStatus } from '../../types/health';

interface LayoutProps {
  systemStatus: HealthStatus | 'connecting' | 'error';
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ systemStatus, children }) => {
  return (
    <div className="app-shell">
      <Header systemStatus={systemStatus} />
      <main className="main-content" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
};
