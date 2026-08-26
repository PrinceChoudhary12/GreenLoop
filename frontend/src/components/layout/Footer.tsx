import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} GreenLoop. Waste Management &amp; Recycling Platform Foundation.
        </p>
        <p className="footer-text">
          Architecture Foundation v1.0.0
        </p>
      </div>
    </footer>
  );
};
