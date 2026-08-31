import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <Header />
      <main className="main-content" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
};
