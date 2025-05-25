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
          <div className="feature-video">
            <video 
              src="/yoread-feature.mp4" 
              controls
              className="demo-video"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="feature-description">
            <p>Continue Reading from where you want!</p>
            <ol>
              <li>Select any text in your book</li>
              <li>Click the "Read" button</li>
              <li>The reading will start from your selection</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureHighlight; 