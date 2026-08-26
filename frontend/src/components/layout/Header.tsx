import React from 'react';
import { Leaf } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import type { HealthStatus } from '../../types/health';

interface HeaderProps {
  systemStatus: HealthStatus | 'connecting' | 'error';
}

export const Header: React.FC<HeaderProps> = ({ systemStatus }) => {
  return (
    <header className="header" role="banner">
      <div className="header-container">
        <a href="/" className="logo-link" aria-label="GreenLoop Home">
          <div className="logo-icon">
            <Leaf size={20} aria-hidden="true" />
          </div>
          <span className="logo-text">
            Green<span>Loop</span>
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <StatusBadge
            status={systemStatus}
            label={systemStatus === 'healthy' ? 'API Online' : undefined}
          />
        </div>
      </div>
    </header>
  );
};
