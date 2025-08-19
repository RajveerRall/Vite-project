import React from 'react';
import './FeatureHighlight.css';

interface FeatureHighlightProps {
  onClose: () => void;
}

const FeatureHighlight: React.FC<FeatureHighlightProps> = ({ onClose }) => {
  return (
    <div className="feature-highlight">
      <div className="feature-content">
        <div className="feature-header">
          <h3>Select text & click on "Read" button</h3>
          <button onClick={onClose} className="close-button">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="feature-body">
          <div className="feature-description">
            <p className="feature-intro">Continue Reading from where you want!</p>
            <div className="feature-steps">
              <div className="step-item">
                <span className="step-number">1</span>
                <span className="step-text">Select any text in your book</span>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <span className="step-text">Click the "Read" button</span>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <span className="step-text">The reading will start from your selection</span>
              </div>
            </div>
            <p className="feature-tip">💡 Tip: This feature is perfect for continuing from where you left off or jumping to specific paragraphs!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureHighlight; 