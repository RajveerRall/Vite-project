import React, { useState, useEffect } from 'react';

interface EnhancedLoaderProps {
  isLoading: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isPlayModeVisible: boolean;
  currentContent?: string;
}

const EnhancedLoader: React.FC<EnhancedLoaderProps> = ({
  isLoading,
  isProcessing,
  isSpeaking,
  isPaused,
  isPlayModeVisible,
  currentContent
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  useEffect(() => {
    if (isLoading && !isProcessing) {
      // Simulate book loading progress
      setStage('Loading book structure...');
      setProgress(0);
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) {
            setStage('Extracting EPUB files...');
          } else if (prev < 60) {
            setStage('Processing table of contents...');
          } else if (prev < 85) {
            setStage('Preparing content...');
          } else if (prev < 95) {
            setStage('Almost ready...');
          }
          
          return Math.min(prev + Math.random() * 15, 95);
        });
      }, 200);

      return () => clearInterval(interval);
    }
    
    if (isProcessing && !isSpeaking && !isPaused) {
      setStage('Preparing audio...');
      setProgress(50);
    }
  }, [isLoading, isProcessing, isSpeaking, isPaused]);

  if (!((isLoading && !currentContent && !isPlayModeVisible) || (isProcessing && !isSpeaking && !isPaused && !isPlayModeVisible))) {
    return null;
  }

  return (
    <div className="enhanced-loading-overlay">
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

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
            <div className="progress-shine" />
          </div>
          <div className="progress-text">{Math.round(progress)}%</div>
        </div>

        {/* Loading Text */}
        <div className="text-section">
          <h3 className="primary-text">
            {isLoading ? 'Opening your book' : 'Preparing audio'}
          </h3>
          <p className="secondary-text">{stage}</p>
          
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

export default EnhancedLoader; 