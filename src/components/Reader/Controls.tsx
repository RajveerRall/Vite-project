import React from 'react';
import { useFullCastUsage } from '../../hooks/useFullCastUsage';
import {
  ChevronLeft, ChevronRight, Headphones, PlayCircle, PauseCircle, RotateCcw, Loader2, Square
} from 'lucide-react';

// Import the stylesheet. It will now handle all the appearance styling.
import './Controls.css'; 

interface ControlsProps {
  currentPage: number;
  totalPages: number;
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
  // Full Cast props
  fullCastActive: boolean;
  fullCastStatus: string;
  fullCastBuffered: number;
  fullCastNeedsTap: boolean;
  fullCastPaused?: boolean;
  onFullCastStop: () => void;
  onFullCastPause?: () => void;
  onFullCastResume?: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  currentPage,
  totalPages,
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
  isReadButtonActive,
  // Full Cast props
  fullCastActive,
  fullCastStatus,
  fullCastBuffered,
  fullCastNeedsTap,
  fullCastPaused,
  onFullCastStop,
  onFullCastPause,
  onFullCastResume
}) => {
  const { usedMinutes: fcUsed, totalMinutes: fcTotal } = useFullCastUsage();

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
  const showFullCastStatus = fullCastActive;
  
  // Determine which mode is active to hide other options
  const isReadModeActive = isReading || isPaused || isProcessing || canResume;
  const isAudiobookModeActive = isPlayModeActive;

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
        {/* Full Cast Status Display - shows when Full Cast is active */}
        {showFullCastStatus ? (
          <>
            {/* Full Cast Status */}
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs md:text-sm">{fullCastStatus}</span>
              {fullCastBuffered > 0 && (
                <span className="text-xs bg-gray-100 rounded px-2 py-0.5">Buffered: {fullCastBuffered}</span>
              )}
              {fullCastNeedsTap && (
                <button
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                  onClick={() => {
                    try {
                      const a = (window as any).__fullCastAudio as HTMLAudioElement | undefined;
                      a?.play();
                    } catch {}
                  }}
                >
                  Tap to Play
                </button>
              )}
            </div>
            
            {/* Full Cast Controls: Pause/Resume and Stop */}
            {!fullCastPaused ? (
              <button
                onClick={onFullCastPause}
                className="control-button flex items-center gap-2 px-3 py-2"
                aria-label="Pause Full Cast"
                title="Pause Full Cast narration"
              >
                <PauseCircle size={20} />
                <span className="button-text text-sm font-medium">Pause</span>
              </button>
            ) : (
              <button
                onClick={onFullCastResume}
                className="control-button flex items-center gap-2 px-3 py-2"
                aria-label="Resume Full Cast"
                title="Resume Full Cast narration"
              >
                <PlayCircle size={20} />
                <span className="button-text text-sm font-medium">Resume</span>
              </button>
            )}

            <button
              onClick={onFullCastStop}
              className="control-button stop-button flex items-center gap-2 px-3 py-2"
              aria-label="Stop Full Cast"
              title="Stop Full Cast narration"
            >
              <Square size={20} />
              <span className="button-text text-sm font-medium">Stop</span>
            </button>
          </>
        ) : (
          <>
            {/* Read Mode Controls - Show when Read mode is active */}
            {isReadModeActive ? (
              <>
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
              </>
            ) : (
              <>
                {/* Read Button - Show when no mode is active */}
                <button
                  onClick={onReadAloud}
                  className="control-button flex items-center gap-2 px-3 py-2"
                  aria-label={readButtonTitle}
                  title={readButtonTitle}
                  disabled={isProcessing && !isReading && !isPaused}
                >
                  <PlayCircle size={20} />
                  <span className="button-text text-sm font-medium">Read Aloud</span>
                </button>
              </>
            )}

            {/* Audiobook Mode Controls - Show when Audiobook mode is active */}
            {isAudiobookModeActive ? (
              <>
                {/* Audiobook Stop Button */}
                <button
                  onClick={onAudiobook}
                  className="control-button stop-button flex items-center gap-2 px-3 py-2"
                  aria-label="Stop Audiobook"
                  title="Stop Audiobook mode"
                >
                  <Square size={20} />
                  <span className="button-text text-sm font-medium">Stop</span>
                </button>
              </>
            ) : !isReadModeActive ? (
              <>
                {/* Audiobook Button - Show when no mode is active */}
                <button
                  onClick={onAudiobook}
                  className="control-button hidden md:flex items-center gap-2 px-3 py-2"
                  aria-label="Audiobook mode"
                  title="Audiobook mode"
                  disabled={isProcessing}
                >
                  <Headphones size={20} />
                  <span className="button-text text-sm font-medium">Offline TTS</span>
                </button>
              </>
            ) : null}

            {/* Full Cast Button - Only show when no mode is active */}
            {!isReadModeActive && !isAudiobookModeActive && (
              <button
                className="control-button flex items-center gap-2 px-3 py-2 border border-gray-300"
                onClick={() => {
                  // Enforce 300-minute monthly quota for Full Cast
                  if (typeof fcUsed === 'number' && typeof fcTotal === 'number' && fcUsed >= fcTotal) {
                    alert('You have reached your Full Cast monthly quota (300 minutes).');
                    return;
                  }
                  const event = new CustomEvent('full-cast-request');
                  window.dispatchEvent(event);
                }}
                title="Full Cast Narration (Beta)"
                aria-label="Full Cast Narration"
                disabled={isProcessing}
              >
                <span className="button-text text-sm font-medium">Full Cast Audiobook</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Controls;