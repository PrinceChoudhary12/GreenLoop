import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import type { HealthStatus } from '../../types/health';

interface LayoutProps {
  children: React.ReactNode;
  systemStatus?: HealthStatus | 'connecting' | 'error';
}

export const Layout: React.FC<LayoutProps> = ({ children, systemStatus }) => {
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
