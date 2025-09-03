import React from 'react';
import {
  ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2, Square
} from 'lucide-react';

// Import the stylesheet. It will now handle all the appearance styling.
import './Controls.css'; 

interface ControlsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onReadAloud: () => void;
  onStopTTS: () => void;
  onPreviousSentence: () => void;  // New: Previous sentence navigation
  onNextSentence: () => void;      // New: Next sentence navigation
  isReading: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  canResume: boolean;
  onAudiobook: () => void;
  isPlayModeActive: boolean;
  isReadButtonActive: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onReadAloud,
  onStopTTS,
  onPreviousSentence,  // New: Previous sentence navigation
  onNextSentence,      // New: Next sentence navigation
  isReading,
  isPaused,
  isProcessing,
  canResume,
  onAudiobook,
  isPlayModeActive,
  isReadButtonActive
}) => {

  let readButtonIcon: React.ReactNode;
  let readButtonLabel: string;
  let readButtonTitle: string;

  if (isProcessing && !isReading && !isPaused) {
    readButtonIcon = <Loader2 size={20} className="animate-spin" />;
    readButtonLabel = 'Loading...';
    readButtonTitle = 'Preparing audio...';
  } else if (isPaused) {
    readButtonIcon = <PlayCircle size={20} />;
    readButtonLabel = 'Resume';
    readButtonTitle = 'Resume paused reading';
  } else if (isReading) {
    readButtonIcon = <PauseCircle size={20} />;
    readButtonLabel = 'Pause';
    readButtonTitle = 'Pause reading';
  } else if (canResume) {
    readButtonIcon = <RotateCcw size={20} />;
    readButtonLabel = 'Resume';
    readButtonTitle = 'Resume reading from last TTS position';
  } else {
    readButtonIcon = <PlayCircle size={20} />;
    readButtonLabel = 'Read';
    readButtonTitle = 'Read aloud (select text or from start of page)';
  }

  const showStopButton = isReading || isPaused || isProcessing;

  return (
    // This container uses Tailwind for high-level layout with better space management
    <div className="flex flex-wrap items-center justify-between gap-4">
      
      {/* Navigation Controls - Prev/Next removed; keep page info */}
      <div className="flex items-center gap-x-3 flex-shrink-0">
        <span className="page-info px-4 py-2 rounded-lg text-sm font-medium">
          {currentPage + 1} / {totalPages}
        </span>
      </div>

      {/* Audio Controls use Tailwind for layout with better space management */}
      <div className="flex items-center gap-x-2 flex-shrink-0">
        {/* Read/Pause/Resume Button */}
        <button
          onClick={onReadAloud}
          className={`control-button flex items-center gap-2 px-3 py-2 ${isReadButtonActive ? 'active' : ''}`}
          aria-label={readButtonTitle}
          title={readButtonTitle}
          disabled={isProcessing && !isReading && !isPaused}
        >
          {readButtonIcon}
          <span className="button-text text-sm font-medium">{readButtonLabel}</span>
        </button>

        {/* Previous Sentence Button - Only show when TTS is active */}
        {(isReading || isPaused || canResume) && (
          <button
            onClick={onPreviousSentence}
            className="control-button flex items-center gap-2 px-3 py-2"
            aria-label="Previous sentence"
            title="Listen to previous sentence"
            disabled={isProcessing}
          >
            <ChevronLeft size={16} />
            <span className="button-text text-sm font-medium">Prev</span>
          </button>
        )}

        {/* Next Sentence Button - Only show when TTS is active */}
        {(isReading || isPaused || canResume) && (
          <button
            onClick={onNextSentence}
            className="control-button flex items-center gap-2 px-3 py-2"
            aria-label="Next sentence"
            title="Listen to next sentence"
            disabled={isProcessing}
          >
            <span className="button-text text-sm font-medium">Next</span>
            <ChevronRight size={16} />
          </button>
        )}

        {/* Stop Button */}
        {showStopButton && (
          <button
            onClick={onStopTTS}
            className="control-button stop-button flex items-center gap-2 px-3 py-2"
            aria-label="Stop TTS"
            title="Stop TTS and clear saved position"
          >
            <Square size={20} />
            <span className="button-text text-sm font-medium">Stop</span>
          </button>
        )}

        {/* Audiobook Button */}
        <button
          onClick={onAudiobook}
          // We keep Tailwind's responsive classes for layout control
          className={`control-button hidden md:flex items-center gap-2 px-3 py-2 ${isPlayModeActive ? 'active' : ''}`}
          aria-label="Audiobook mode"
          title="Audiobook mode"
          disabled={isProcessing}
        >
          <Headphones size={20} />
          <span className="button-text text-sm font-medium">Audiobook</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;