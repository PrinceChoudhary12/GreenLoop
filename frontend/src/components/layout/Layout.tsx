import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import { SearchModal } from '../search/SearchModal';
import { useTheme } from '../../context/useTheme';
import type { HealthStatus } from '../../types/health';

interface LayoutProps {
  children: React.ReactNode;
  systemStatus?: HealthStatus | 'connecting' | 'error';
}

export const Layout: React.FC<LayoutProps> = ({ children, systemStatus }) => {
  const { preferences, setSidebarMode } = useTheme();
  const collapsed = preferences.sidebarMode === 'collapsed';
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  const toggleCollapse = () => {
    setSidebarMode(collapsed ? 'expanded' : 'collapsed');
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

  // Global keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main className="main-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </div>

      {/* Global Command/Search Palette */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
};
