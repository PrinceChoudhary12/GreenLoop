import React from 'react';
import { Award, Zap, Trophy, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import './RewardsPage.css';

export const RewardsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="rewards-page-container">
      <div className="rewards-hero-card">
        <div className="rewards-icon-badge">
          <Award size={36} />
        </div>
        <h1 className="rewards-page-title">Eco Rewards & Impact Badges</h1>
        <p className="rewards-page-subtitle">
          Earn eco-points and community badges by reporting waste incidents and completing verified recycling pickups.
        </p>

        {/* Milestone Architecture Notice */}
        <div className="rewards-status-banner">
          <Clock size={18} className="banner-icon" />
          <div className="banner-content">
            <strong>Architecture Notice — Milestone 10 (Gamification)</strong>
            <span>
              Real-time eco-points calculation, badges, and leaderboard integration will be connected in Milestone 10. Per platform safety rules, no fake or fabricated scores are generated.
            </span>
          </div>
        </div>

        {/* Planned Reward Tiers */}
        <div className="rewards-preview-grid">
          <div className="preview-tier-card">
            <Zap size={24} className="tier-icon" />
            <h3>Action Streaks</h3>
            <p>Maintain continuous recycling and scheduled pickup participation.</p>
          </div>

          <div className="preview-tier-card">
            <Trophy size={24} className="tier-icon" />
            <h3>Community Leaderboard</h3>
            <p>Celebrate top neighborhood citizens and highest-rated waste collectors.</p>
          </div>

          <div className="preview-tier-card">
            <ShieldCheck size={24} className="tier-icon" />
            <h3>Verified Impact Badges</h3>
            <p>Certified badges based on real verified collection volume from M05/M07.</p>
          </div>
        </div>

        <div className="rewards-card-footer">
          <span>Logged in as <strong>{user?.name}</strong> ({user?.role})</span>
        </div>
      </div>
    </div>
  );
};
