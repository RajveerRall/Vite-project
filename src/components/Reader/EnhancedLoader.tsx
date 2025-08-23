import React, { useState, useEffect } from 'react';

interface EnhancedLoaderProps {
  isLoading?: boolean;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  isPaused?: boolean;
  isPlayModeVisible?: boolean;
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
    <div className="simple-loading-overlay">
      <div className="simple-loading-content">
        {/* Simple Spinner */}
        <div className="simple-spinner"></div>

        {/* Progress Bar */}
        <div className="simple-progress-section">
          <div className="simple-progress-bar">
            <div 
              className="simple-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="simple-progress-text">{Math.round(progress)}%</div>
        </div>

        {/* Loading Text */}
        <div className="simple-text-section">
          <h3 className="simple-primary-text">
            {isLoading ? 'Opening your book' : 'Preparing audio'}
          </h3>
          <p className="simple-secondary-text">{stage}</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLoader;