// src/components/Reader/Controls.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle } from 'lucide-react';
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
      <div className="nav-controls">
        <button 
          onClick={onPrevious} 
          disabled={currentPage === 0}
          className="control-button icon-button"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={20} />
        </button>
        
        <span className="page-info">
          {currentPage + 1} / {totalPages}
        </span>
        
        <button 
          onClick={onNext} 
          disabled={currentPage === totalPages - 1}
          className="control-button icon-button"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="audio-controls">
        <button 
          onClick={onReadAloud} 
          className={`control-button icon-button ${isReading ? 'active' : ''}`}
          aria-label={isReading ? 'Stop reading' : 'Read aloud'}
          title={isReading ? 'Stop reading' : 'Read aloud'}
        >
          {isReading ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
          <span className="button-text">Read</span>
        </button>
        
        <button 
          onClick={onAudiobook} 
          className={`control-button icon-button ${isPlayModeActive ? 'active' : ''}`}
          aria-label="Audiobook mode"
          title="Audiobook mode"
        >
          <Headphones size={20} />
          <span className="button-text">Audiobook</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;