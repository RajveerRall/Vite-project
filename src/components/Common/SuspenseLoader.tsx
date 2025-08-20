import React from 'react';
import './SuspenseLoader.css';

const SuspenseLoader: React.FC = () => {
  return (
    <div className="suspense-loading-container">
      {/* Floating Background Elements */}
      <div className="floating-elements">
        <div className="floating-book book-1">📖</div>
        <div className="floating-book book-2">📚</div>
        <div className="floating-book book-3">📄</div>
        <div className="floating-book book-4">✨</div>
      </div>

      {/* Main Loading Content */}
      <div className="loading-content">
        {/* Enhanced Spinner */}
        <div className="spinner-container">
          <div className="spinner-outer">
            <div className="spinner-inner"></div>
            <div className="spinner-dot"></div>
          </div>
          <div className="book-icon">📖</div>
        </div>

        {/* Loading Text */}
        <div className="text-section">
          <h3 className="primary-text">Loading Reader</h3>
          <p className="secondary-text">Preparing your reading experience...</p>
          
          {/* Animated Dots */}
          <div className="dots-container">
            <span className="dot dot-1">●</span>
            <span className="dot dot-2">●</span>
            <span className="dot dot-3">●</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspenseLoader; 