import React from 'react';
import './SuspenseLoader.css';

const SuspenseLoader: React.FC = () => {
  return (
    <div className="simple-suspense-container">
      <div className="simple-suspense-content">
        {/* Simple Spinner */}
        <div className="simple-suspense-spinner"></div>

        {/* Loading Text */}
        <div className="simple-suspense-text">
          <h3 className="simple-suspense-title">Loading Reader</h3>
          <p className="simple-suspense-subtitle">Preparing your reading experience...</p>
        </div>
      </div>
    </div>
  );
};

export default SuspenseLoader; 