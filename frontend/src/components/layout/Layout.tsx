import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import type { HealthStatus } from '../../types/health';

interface LayoutProps {
  children: React.ReactNode;
  systemStatus?: HealthStatus | 'connecting' | 'error';
}

export const Layout: React.FC<LayoutProps> = ({ children, systemStatus }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('greenloop_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('greenloop_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="app-main-wrapper">
        <TopBar
          systemStatus={systemStatus}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="main-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};
