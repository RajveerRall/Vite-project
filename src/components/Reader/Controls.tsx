import React, { useState, useMemo, useRef } from 'react';
import { useFullCastUsage } from '../../hooks/useFullCastUsage';
import { useSubscription } from '../../context/SubscriptionContext';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import { UsageLimitModal } from '../UsageLimitModal';
import { UsageWarningToast } from '../UsageWarningToast';
import {
  Headphones,
  PlayCircle, PauseCircle, RotateCcw,
  Loader2, Square, SkipBack, SkipForward, Settings
} from 'lucide-react';
import InteractiveProgressBar from './InteractiveProgressBar';
import SpeedControlDropdown from './SpeedControlDropdown';
import MobileTOCDrawer from './MobileTOCDrawer';
import MobileAIChatDrawer from './MobileAIChatDrawer';
import { TOCItem } from '../../types/books';
import { useSmoothProgress } from '../../hooks/tts/useSmoothProgress';

// Import the stylesheet. It will now handle all the appearance styling.
import './Controls.css';

export interface ControlsProps {
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
  // Interactive Progress Bar handlers
  onPreviewScroll?: (percentage: number) => void;
  onSeekToPercentage?: (percentage: number) => void;
  // Full Cast props
  fullCastActive: boolean;
  fullCastStatus: string;
  fullCastBuffered: number;
  fullCastNeedsTap: boolean;
  fullCastPaused?: boolean;
  onFullCastStop: () => void;
  onFullCastPause?: () => void;
  onFullCastResume?: () => void;
  // Anonymous usage limit
  anonymousLimit?: any;
  // Buffering state
  bufferedChunksCount?: number;
  // TOC props for chapters button
  toc?: TOCItem[];
  onNavigateToTocItem?: (item: TOCItem) => void;
  theme?: 'light' | 'dark' | 'sepia';
  isEnhanced?: boolean;
  isMobile?: boolean;
  isFirstOpen?: boolean;
  // Chapter summarization props
  currentPageText?: string;
  currentChapterTitle?: string;
  bookId?: string;
  onSummarizeChapter?: () => void;
  // TTS for summary
  onReadAloudSummary?: (text?: string) => void;
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
  // Interactive Progress Bar handlers
  onPreviewScroll,
  onSeekToPercentage,
  // Full Cast props
  fullCastActive,
  fullCastStatus,
  fullCastBuffered,
  fullCastNeedsTap,
  fullCastPaused,
  onFullCastStop,
  onFullCastPause,
  onFullCastResume,
  anonymousLimit,
  bufferedChunksCount = 0,
  toc,
  onNavigateToTocItem,
  theme,
  isEnhanced,
  isMobile,
  isFirstOpen,
  currentPageText,
  currentChapterTitle,
  bookId,
  onSummarizeChapter,
  onReadAloudSummary
}) => {
  const { usedMinutes: fcUsed, totalMinutes: fcTotal } = useFullCastUsage();
  const { isLimitExceeded } = useSubscription();
  const { addToast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAIChatDrawerOpen, setIsAIChatDrawerOpen] = useState(false);

  // Calculate raw chapter progress percentage (memoized)
  const rawChapterProgress = useMemo(() => {
    return totalChunks > 0 && currentChunkIndex !== null
      ? Math.round(((currentChunkIndex + 1) / totalChunks) * 100)
      : 0;
  }, [currentChunkIndex, totalChunks]);

  // Smooth progress animation for progress bar
  const chapterProgress = useSmoothProgress({
    currentValue: rawChapterProgress,
    targetValue: rawChapterProgress,
    duration: 200,
    enabled: isReading || isPaused, // Only animate when TTS is active
  });

  const showStopButton = isReading || isPaused || isProcessing;

  // Determine which mode is active to hide other options
  const isReadModeActive = isReading || isPaused || isProcessing || canResume;
  // const isAudiobookModeActive = isPlayModeActive;

  // Check if TTS is disabled due to limit (anonymous or authenticated)
  const isDisabledDueToLimit = anonymousLimit?.isLimitReached || isLimitExceeded || false;

  // Unified button state calculation (memoized for performance)
  const buttonState = useMemo(() => {
    if (isDisabledDueToLimit) {
      return {
        icon: 'disabled',
        title: anonymousLimit?.isLimitReached
          ? 'Free limit reached. Please sign up to continue.'
          : 'TTS usage limit reached. Please upgrade your subscription to continue.',
        disabled: true,
      };
    }

    if (isProcessing && !isReading && !isPaused) {
      return {
        icon: 'loading',
        title: 'Preparing audio...',
        disabled: true,
      };
    }

    if (isPaused) {
      return {
        icon: 'play',
        title: 'Resume paused reading',
        disabled: false,
      };
    }

    if (isReading) {
      return {
        icon: 'pause',
        title: 'Pause reading',
        disabled: false,
      };
    }

    if (canResume) {
      return {
        icon: 'resume',
        title: 'Resume reading from last TTS position',
        disabled: false,
      };
    }

    return {
      icon: 'play',
      title: 'Read aloud (select text or from start of page)',
      disabled: false,
    };
  }, [isDisabledDueToLimit, isProcessing, isReading, isPaused, canResume, anonymousLimit, isLimitExceeded]);

  // Debounced click handler to prevent rapid clicks
  const lastClickTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 300;

  // Handle read aloud button click - show toast if disabled due to anonymous limit
  const handleReadAloudClick = () => {
    // Debounce rapid clicks
    const now = Date.now();
    if (now - lastClickTimeRef.current < DEBOUNCE_MS) {
      return;
    }
    lastClickTimeRef.current = now;

    // If disabled due to anonymous limit, show toast
    if (isDisabledDueToLimit && anonymousLimit?.isLimitReached) {
      addToast('Sign up to listen for free', 'info');
      return;
    }
    // If disabled due to authenticated limit, don't do anything (button will be disabled)
    if (isDisabledDueToLimit && isLimitExceeded) {
      return;
    }
    // Otherwise, proceed with normal TTS
    onReadAloud();
  };

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
                  } catch { }
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
          <InteractiveProgressBar
            progress={chapterProgress}
            onPreview={onPreviewScroll || (() => { })}
            onSeek={onSeekToPercentage || (() => { })}
            isActive={!!(onPreviewScroll && onSeekToPercentage) && isReadModeActive}
          />
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
              onClick={handleReadAloudClick}
              className={`p-3 md:p-4 rounded-full flex items-center gap-2 transition-all duration-200 ${buttonState.disabled
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : isReadButtonActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              aria-label={buttonState.title}
              title={buttonState.title}
              disabled={buttonState.disabled}
            >
              {buttonState.icon === 'loading' ? (
                <>
                  <Loader2 size={22} className="animate-spin md:text-[26px]" />
                  <span className="text-xs font-medium"  >Loading</span>
                </>
              ) : buttonState.icon === 'play' ? (
                <>
                  <PlayCircle size={22} className="md:text-[26px]" />
                  <span className="text-xs font-medium" >Play</span>
                </>
              ) : buttonState.icon === 'pause' ? (
                <>
                  <PauseCircle size={22} className="md:text-[26px]" />
                  <span className="text-xs font-medium" >Pause</span>
                </>
              ) : buttonState.icon === 'resume' ? (
                <>
                  <RotateCcw size={22} className="md:text-[26px]" />
                  <span className="text-xs font-medium"  >Resume</span>
                </>
              ) : (
                <>
                  <PlayCircle size={22} className="md:text-[26px]" />
                  <span className="text-xs font-medium"  >Play</span>
                </>
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
            {/* Speed Control - Compact Dropdown */}
            {onSpeedChange && (
              <SpeedControlDropdown
                currentSpeed={ttsSpeed}
                onSpeedChange={onSpeedChange}
                minSpeed={0.8}
                maxSpeed={1.5}
                speeds={[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5]}
              />
            )}

            {/* Stop Button - Disabled/Hidden as per request */}
            {/* {showStopButton && (
              <button
                onClick={onStopTTS}
                className="p-1.5 md:p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                aria-label="Stop TTS"
                title="Stop TTS"
              >
                <Square size={18} className="md:text-[22px]" />
              </button>
            )} */}
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
        {/* AI Summary Button - Mobile Only */}
        {isMobile && (
          <MobileAIChatDrawer
            theme={theme || 'light'}
            currentPageText={currentPageText}
            currentChapterTitle={currentChapterTitle}
            bookId={bookId}
            onReadAloud={onReadAloudSummary}
            isOpen={isAIChatDrawerOpen}
            onOpenChange={setIsAIChatDrawerOpen}
          />
        )}

        {/* Chapters Button - Mobile Only */}
        {isEnhanced && isMobile && (
          <MobileTOCDrawer
            toc={toc || []}
            onItemClick={onNavigateToTocItem || (() => { })}
            theme={theme || 'light'}
            openByDefault={isFirstOpen || false}
          />
        )}

        {/* Read Aloud Button */}
        <button
          onClick={handleReadAloudClick}
          className={`control-button flex items-center gap-2 px-3 py-2 ${buttonState.disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          aria-label={buttonState.title}
          title={buttonState.title}
          disabled={buttonState.disabled}
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
          style={{ display: 'none' }}
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

      {/* Show warning toast for anonymous users near limit */}
      {anonymousLimit && anonymousLimit.isNearLimit && !anonymousLimit.isLimitReached && (
        <UsageWarningToast
          remainingMinutes={anonymousLimit.remainingMinutes}
          percentageUsed={anonymousLimit.percentageUsed}
          isCritical={anonymousLimit.isCritical}
        />
      )}

      {/* Usage limit modal */}
      {anonymousLimit && (
        <UsageLimitModal
          isOpen={anonymousLimit.showLimitModal}
          onClose={() => anonymousLimit.setShowLimitModal(false)}
          onSignIn={() => {
            anonymousLimit.setShowLimitModal(false);
            setShowAuthModal(true);
          }}
        />
      )}
    </div>
  );
};

export default Controls;