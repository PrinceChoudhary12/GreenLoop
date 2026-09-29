import { MessageSquare, Shield, Clock, Users } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import './MessagesPage.css';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="messages-page-container">
      <div className="messages-page-card">
        <div className="messages-icon-wrap">
          <MessageSquare size={36} className="messages-icon" />
        </div>

        <h1 className="messages-title">Messages & Dispatch Center</h1>
        <p className="messages-subtitle">
          Direct, authenticated communication between Citizens, Collectors, and Platform Administrators.
        </p>

        <div className="messages-status-banner">
          <Clock size={18} className="banner-icon" />
          <div className="banner-content">
            <strong>Architecture Notice</strong>
            <span>
              Direct messaging and dispatch communication infrastructure is scheduled for the upcoming platform integration phase. No fake messages or conversations are displayed.
            </span>
          </div>
        </div>

        <div className="messages-feature-grid">
          <div className="feature-item">
            <Shield size={20} className="feature-icon" />
            <div>
              <h3>Role-Aware Privacy</h3>
              <p>Contextual messaging linked directly to waste reports and pickup dispatches without exposing private contact info.</p>
            </div>
          </div>

          <div className="feature-item">
            <Users size={20} className="feature-icon" />
            <div>
              <h3>Direct Collector Chat</h3>
              <p>Real-time pickup coordination between citizens and assigned verified waste collectors.</p>
            </div>
          </div>
        </div>

        <div className="messages-card-footer">
          <span className="user-role-notice">
            Logged in as <strong>{user?.name}</strong> ({user?.role})
          </span>
        </div>
      </div>
    </div>
  );
};
