// src/components/Reader/Controls.tsx
import React from 'react';
import './Controls.css';

interface ControlsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onReadAloud: () => void;
  isReading: boolean;
  onAudiobook: () => void;
  isPlayModeActive: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onReadAloud,
  isReading,
  onAudiobook,
  isPlayModeActive
}) => {
  return (
    <div className="reader-controls">
      <button 
        onClick={onPrevious} 
        disabled={currentPage === 0}
        className="control-button previous-button"
      >
        Previous
      </button>
      
      <span className="page-info">
        Page {currentPage + 1} of {totalPages}
      </span>
      
      <button 
        onClick={onNext} 
        disabled={currentPage === totalPages - 1}
        className="control-button next-button"
      >
        Next
      </button>
      
      <button 
        onClick={onReadAloud} 
        className={`control-button tts-button ${isReading ? 'active' : ''}`}
      >
        {isReading ? 'Stop TTS' : 'Read Aloud'}
      </button>
      
      <button 
        onClick={onAudiobook} 
        className={`control-button audiobook-button ${isPlayModeActive ? 'active' : ''}`}
      >
        Audiobook Mode
      </button>
    </div>
  );
};

export default Controls;