import React from 'react';
import { useFullCastUsage } from '../../hooks/useFullCastUsage';
import { trackEvent } from '../../lib/analytics';
import {
  Headphones, 
  PlayCircle, PauseCircle, RotateCcw, 
  Loader2, Square, SkipBack, SkipForward, Settings
} from 'lucide-react';

// Import the stylesheet. It will now handle all the appearance styling.
import './Controls.css'; 

interface ControlsProps {
  readingProgress: number;
  onReadAloud: () => void;
  onStopTTS: () => void;
  onPreviousSentence: () => void;
  onNextSentence: () => void;
  isReading: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  canResume: boolean;
  // onAudiobook: () => void;
  // isPlayModeActive: boolean;
  isReadButtonActive: boolean;
  // Progress tracking
  currentChunkIndex?: number | null;
  totalChunks?: number;
  // Speed control
  ttsSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  // Settings
  onOpenSettings?: () => void;
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
  readingProgress,
  onReadAloud,
  onStopTTS,
  onPreviousSentence,
  onNextSentence,
  isReading,
  isPaused,
  isProcessing,
  canResume,
  // onAudiobook,
  // isPlayModeActive,
  isReadButtonActive,
  // Progress tracking
  currentChunkIndex = null,
  totalChunks = 0,
  // Speed control
  ttsSpeed = 1,
  onSpeedChange,
  // Settings
  onOpenSettings,
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

  // Calculate chapter progress percentage
  const chapterProgress = totalChunks > 0 && currentChunkIndex !== null 
    ? Math.round(((currentChunkIndex + 1) / totalChunks) * 100)
    : 0;

  const showStopButton = isReading || isPaused || isProcessing;
  
  // Determine which mode is active to hide other options
  const isReadModeActive = isReading || isPaused || isProcessing || canResume;
  // const isAudiobookModeActive = isPlayModeActive;

  // Button title logic
  let readButtonTitle: string;
  if (isProcessing && !isReading && !isPaused) {
    readButtonTitle = 'Preparing audio...';
  } else if (isPaused) {
    readButtonTitle = 'Resume paused reading';
  } else if (isReading) {
    readButtonTitle = 'Pause reading';
  } else if (canResume) {
    readButtonTitle = 'Resume reading from last TTS position';
  } else {
    readButtonTitle = 'Read aloud (select text or from start of page)';
  }

  // Show Full Cast controls when Full Cast is active
  if (fullCastActive) {
    return (
      <div className="music-player-controls bg-white rounded-xl border border-gray-200 shadow-lg p-6">
        {/* Full Cast Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{fullCastStatus}</span>
            {fullCastBuffered > 0 && (
              <span className="text-xs bg-gray-100 rounded px-2 py-0.5">Buffered: {fullCastBuffered}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
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
            
            {!fullCastPaused ? (
              <button
                onClick={onFullCastPause}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Pause Full Cast"
                title="Pause Full Cast"
              >
                <PauseCircle size={18} className="text-gray-600" />
              </button>
            ) : (
              <button
                onClick={onFullCastResume}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Resume Full Cast"
                title="Resume Full Cast"
              >
                <PlayCircle size={18} className="text-gray-600" />
              </button>
            )}

            <button
              onClick={onFullCastStop}
              className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
              aria-label="Stop Full Cast"
              title="Stop Full Cast"
            >
              <Square size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show Read Aloud music player controls when Read Aloud is active
  if (isReadModeActive) {
    return (
      <div className="music-player-controls bg-white rounded-xl border border-gray-200 shadow-lg p-2">
        {/* Progress Section */}
        <div className="mb-2">
          {/* Chapter Progress Bar */}
          <div className="relative mb-1">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-amber-600 to-amber-800 h-1 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${chapterProgress}%` }}
              />
            </div>
            {/* Progress percentage */}
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Chapter Progress</span>
              <span className="font-medium text-amber-700">{chapterProgress}%</span>
            </div>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between gap-3 md:gap-4">
          {/* Left Side - Settings Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 md:p-3 rounded-full hover:bg-amber-100 transition-colors"
              aria-label="Open settings"
              title="Open settings"
            >
              <Settings size={20} className="text-amber-700 md:text-[22px]" />
            </button>
          )}

          {/* Center - Play Controls */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Previous Button */}
            <button
              onClick={onPreviousSentence}
              className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Previous sentence"
              title="Previous sentence"
              disabled={isProcessing}
            >
              <SkipBack size={18} className="text-gray-600 md:text-[22px]" />
            </button>

          {/* Main Play/Pause Button */}
          <button
            onClick={onReadAloud}
            className={`p-3 md:p-4 rounded-full transition-all duration-200 ${
              isReadButtonActive 
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            aria-label={readButtonTitle}
            title={readButtonTitle}
            disabled={isProcessing && !isReading && !isPaused}
          >
            {isProcessing && !isReading && !isPaused ? (
              <Loader2 size={22} className="animate-spin md:text-[26px]" />
            ) : isPaused ? (
              <PlayCircle size={22} className="md:text-[26px]" />
            ) : isReading ? (
              <PauseCircle size={22} className="md:text-[26px]" />
            ) : canResume ? (
              <RotateCcw size={22} className="md:text-[26px]" />
            ) : (
              <PlayCircle size={22} className="md:text-[26px]" />
            )}
          </button>

            {/* Next Button */}
            <button
              onClick={onNextSentence}
              className="p-1.5 md:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Next sentence"
              title="Next sentence"
              disabled={isProcessing}
            >
              <SkipForward size={18} className="text-gray-600 md:text-[22px]" />
            </button>
          </div>

          {/* Right Side - Speed Control and Stop Button */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Speed Control - Compact Design */}
            {onSpeedChange && (
              <div className="flex items-center gap-2 md:gap-2.5">
                <button
                  onClick={() => onSpeedChange(Math.max(0.5, ttsSpeed - 0.1))}
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-100 hover:bg-amber-100 border border-gray-200 hover:border-amber-300 flex items-center justify-center text-sm md:text-base font-medium transition-colors text-gray-600 hover:text-amber-700"
                  disabled={ttsSpeed <= 0.5}
                >
                  -
                </button>
                <span className="text-sm md:text-base font-medium mx-2 md:mx-3 text-amber-700 min-w-[1.5rem] md:min-w-[2rem] text-center">
                  {Math.round(ttsSpeed * 10) / 10}x
                </span>
                <button
                  onClick={() => onSpeedChange(Math.min(2.0, ttsSpeed + 0.1))}
                  className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-100 hover:bg-amber-100 border border-gray-200 hover:border-amber-300 flex items-center justify-center text-sm md:text-base font-medium transition-colors text-gray-600 hover:text-amber-700"
                  disabled={ttsSpeed >= 2.0}
                >
                  +
                </button>
              </div>
            )}

            {/* Stop Button */}
            {showStopButton && (
              <button
                onClick={onStopTTS}
                className="p-1.5 md:p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                aria-label="Stop TTS"
                title="Stop TTS"
              >
                <Square size={18} className="md:text-[22px]" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Original Button Layout - When no TTS is active
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Page Info */}
      <div className="flex items-center gap-x-3 flex-shrink-0">
        <span className="page-info px-4 py-2 rounded-lg text-sm font-medium">
          {readingProgress}%
        </span>
      </div>

      {/* Original Action Buttons */}
      <div className="flex items-center gap-x-2 flex-shrink-0">
        {/* Read Aloud Button */}
        <button
          onClick={onReadAloud}
          className="control-button flex items-center gap-2 px-3 py-2"
          aria-label={readButtonTitle}
          title={readButtonTitle}
          disabled={isProcessing && !isReading && !isPaused}
        >
          <Headphones size={20} />
          <span className="button-text text-sm font-medium">Read Aloud</span>
        </button>

        {/* Audiobook Button - COMMENTED OUT */}
        {/* {!isAudiobookModeActive && (
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
        )} */}

        {/* Full Cast Button */}
        <button
          className="control-button flex items-center gap-2 px-3 py-2 border border-gray-300"
          onClick={() => {
            if (typeof fcUsed === 'number' && typeof fcTotal === 'number' && fcUsed >= fcTotal) {
              trackEvent('full_cast_quota_exceeded', {
                used_minutes: fcUsed,
                total_minutes: fcTotal,
                remaining_minutes: Math.max(0, fcTotal - fcUsed)
              });
              alert('You have reached your Full Cast monthly quota (300 minutes).');
              return;
            }
            
            trackEvent('full_cast_start', {
              used_minutes: fcUsed || 0,
              total_minutes: fcTotal || 300,
              remaining_minutes: Math.max(0, (fcTotal || 300) - (fcUsed || 0))
            });
            
            const event = new CustomEvent('full-cast-request');
            window.dispatchEvent(event);
          }}
          title="Full Cast Narration (Beta)"
          aria-label="Full Cast Narration"
          disabled={isProcessing}
        >
          <span className="button-text text-sm font-medium">Full Cast Audiobook</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;