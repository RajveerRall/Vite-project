import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAnonymousUsageLimit } from './useAnonymousUsageLimit';

import { createAdaptivePlaybackStrategy } from '../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../services/tts/strategies/IPlaybackStrategy';
import { createTTSChunkService } from '../services/tts/TTSChunkService';
import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';
import { highlightChunkInHtml, highlightTextInHtml } from '../utils/htmlHighlight';
import { getBlobDurationSeconds } from '../utils/audioUtils';
import { fetchUsageLimit } from '../services/subscription/SubscriptionService';

// Import refactored TTS hooks
import { useTTSChunking, useTTSBuffering, useTTSNavigation, useTTSProgress } from './tts';

export interface UseReaderTTSReturn {
  // TTS States
  chunks: string[];
  currentChunkIndex: number | null;
  isSpeaking: boolean;
  isProcessing: boolean;
  isPaused: boolean;
  resumeIndex: number | null;
  hasFinishedPlayback: boolean;
  useKokoroTTS: boolean;
  highlightedContent: string;
  bufferedChunksCount: number; // Number of chunks currently buffered

  // TTS Controls
  handleTTS: () => void;
  handleStopTTS: () => void;
  pausePlayback: () => void;
  resumePlayback: () => void;

  // Navigation handlers (TTS-aware)
  handleTTSNavigation: () => void;
  handlePreviousSentence: () => void;
  handleNextSentence: () => void;

  // Interactive Progress Bar handlers
  handlePreviewScroll: (percentage: number) => void;
  handleSeekToPercentage: (percentage: number) => void;

  // Audio control
  setPlaybackRate: (rate: number) => void;

  // Content rendering moved back to Reader component

  // Computed values
  canTTSResume: boolean;

  // Anonymous usage limit
  anonymousLimit: ReturnType<typeof useAnonymousUsageLimit>;
}

interface UseReaderTTSProps {
  // Dependencies from Reader
  bookTitle: string;
  currentPageDisplay: number;
  currentPageText: string;
  currentContent: string;
  // New TTS settings
  selectedVoice?: string;
  ttsSpeed?: number;
  // Callback for when playback completes
  onPlaybackComplete?: () => void;
  isPageLoading?: boolean; // Added for better error handling
}

// Constants moved to src/constants/tts.ts
// Constants moved to src/constants/tts.ts
const INITIAL_PREFETCH_COUNT = 2; // Fetch 2 chunks initially for faster startup
// PREFETCH_CHUNK_COUNT and MAX_AUDIO_BUFFER_SIZE handled by useTTSBuffering hook

/**
 * Custom hook for managing all Text-to-Speech functionality
 * Extracted from Reader component for better modularity
 */
export const useReaderTTS = ({
  bookTitle,
  currentPageDisplay,
  currentPageText,
  currentContent,
  selectedVoice = 'en-US-BrianMultilingualNeural',
  ttsSpeed = 1,
  onPlaybackComplete,
  isPageLoading = false // Default to false
}: UseReaderTTSProps): UseReaderTTSReturn => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const { refreshUsageLimit } = useSubscription();
  const anonymousLimit = useAnonymousUsageLimit();

  // === Use refactored chunking hook ===
  // This provides memoized chunks that only recalculate when text changes
  const chunkingHook = useTTSChunking({ text: currentPageText });

  // Initialize progress repository
  const readerInstanceId = useRef(`ReaderInstance_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).current;


  // Initialize playback strategy (with automatic fallback)
  const playbackStrategyRef = useRef<IPlaybackStrategy | null>(null);
  const chunksRef = useRef<string[]>([]);

  if (!playbackStrategyRef.current) {
    playbackStrategyRef.current = createAdaptivePlaybackStrategy({
      playbackRate: ttsSpeed,
      instanceId: readerInstanceId,
      forceStrategy: 'auto', // Auto-detect: seamless if available, HTML5 otherwise
    });
  }

  // Initialize chunk service for pre-decoding
  const chunkServiceRef = useRef(createTTSChunkService(readerInstanceId)).current;

  // === TTS Playback States ===
  // Use chunks from the refactored hook (memoized, only recalculates when text changes)
  const chunks = chunkingHook.chunks;

  // === Use TTS Buffering Hook ===
  const {
    bufferedChunksCount,
    setBufferedChunksCount,
    audioBuffer,
    durationsBuffer,
    fetchSingleChunk,
    prefetchChunks,
    clearAudioBuffer
  } = useTTSBuffering({
    chunks,
    currentChunkIndex: null, // Initial value
    selectedVoice,
    ttsSpeed,
    playbackStrategyRef,
    readerInstanceId
  });

  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // resumeIndex and hasFinishedPlayback moved to useTTSProgress
  const [useKokoroTTS] = useState<boolean>(false);
  const [highlightedContent, setHighlightedContent] = useState<string>(currentContent);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsIntentActiveRef = useRef(false);
  // currentTTSBaseOffsetRef removed (replaced by direct index tracking)

  const playStartTimeRef = useRef<Record<number, number>>({});
  const lastLimitCheckTimeRef = useRef<number>(0);
  const LIMIT_CHECK_INTERVAL_MS = 60000;

  const selectedVoiceRef = useRef<string>(selectedVoice);
  const ttsSpeedRef = useRef<number>(ttsSpeed);
  const lastPauseResumeActionRef = useRef<number>(0);
  const playChunkRef = useRef<((index: number) => Promise<void>) | null>(null);
  const isAutoAdvancingRef = useRef<boolean>(false);
  const handleStopTTSRef = useRef<(() => void) | null>(null);
  const isChunkPlayingRef = useRef<number | null>(null);

  // === Use TTS Progress Hook ===
  const {
    resumeIndex,
    setResumeIndex,
    hasFinishedPlayback,
    saveProgress: saveResumeIndex, // Alias
    loadProgress: loadResumeIndex, // Alias
    clearProgress: clearResumeIndex, // Alias
    markFinished,
    resetFinished
  } = useTTSProgress({
    bookTitle,
    currentPageDisplay,
    pageTextLength: currentPageText?.length || 0,
    instanceId: readerInstanceId
  });

  // Wrapper for compatibility with existing code expecting boolean setter
  const setHasFinishedPlayback = useCallback((finished: boolean) => {
    if (finished) markFinished();
    else resetFinished();
  }, [markFinished, resetFinished]);

  // === Use TTS Navigation Hook ===
  const {
    handleTTSNavigation,
    handlePreviousSentence,
    handleNextSentence,
    handlePreviewScroll,
    handleSeekToPercentage
  } = useTTSNavigation({
    chunks,
    currentChunkIndex,
    readerInstanceId,
    isSpeaking,
    isPaused,
    ttsIntentActiveRef,
    isChunkPlayingRef,
    isAutoAdvancingRef,
    setIsSpeaking,
    setIsPaused,
    setIsProcessing,
    setHasFinishedPlayback,
    setResumeIndex,
    haltPlayback: () => handleStopTTSRef.current?.(),
    pausePlayback: () => {
      // pausePlayback logic is below, use specific handler if possible or ref
    },
    playChunk: async (index) => { if (playChunkRef.current) await playChunkRef.current(index); },
    saveResumeIndex,
    fetchSingleChunk,
    prefetchChunks,
    addToast: addToast as any,
    user,
    refreshUsageLimit,
    anonymousLimit
  });

  // === Keep selectedVoiceRef synchronized with selectedVoice prop ===
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice, readerInstanceId]);

  // === Keep ttsSpeedRef synchronized with ttsSpeed prop ===
  useEffect(() => {
    ttsSpeedRef.current = ttsSpeed;
  }, [ttsSpeed, readerInstanceId]);

  // // === Usage recording helper - Enhanced with queue and retry ===
  // const recordUsageSeconds = useCallback(async (
  //   seconds: number,
  //   options?: { skipLimitCheck?: boolean }
  // ) => {
  //   if (!seconds || seconds <= 0) return;

  //   try {
  //     // Use enhanced usage tracker with queue and retry

  //     // Ensure tracker is initialized
  //     let tracker = getUsageTracker();
  //     if (!tracker) {
  //       await initializeUsageTracking(user?.id);
  //       tracker = getUsageTracker();
  //     }

  //     if (!tracker) {
  //       console.warn('[TTS Usage] Tracker not available, falling back to direct call');
  //       // Fallback to direct call if tracker unavailable
  //       const { supabase } = await import('../lib/supabase');
  //       const { getAnonymousSessionId } = await import('../utils/anonymousSession');

  //       if (user?.id) {
  //         await supabase.rpc('increment_tts_usage', {
  //           p_user_id: user.id,
  //           p_seconds: seconds,
  //           p_source: 'reader'
  //         });
  //       } else {
  //         const sessionId = getAnonymousSessionId();
  //         await supabase.rpc('record_anonymous_tts_usage', {
  //           p_session_id: sessionId,
  //           p_seconds: seconds,
  //           p_source: 'reader',
  //           p_user_agent: navigator.userAgent
  //         });
  //       }
  //       return;
  //     }

  //     // Use enhanced tracker (handles queue, retry, circuit breaker)
  //     await tracker.recordUsageSeconds(seconds, 'reader', {
  //       skipLimitCheck: options?.skipLimitCheck ?? false,  // ✅ Pass through skipLimitCheck
  //       onSuccess: () => {
  //         console.log('[TTS Usage] Recorded successfully via enhanced tracker');
  //       },
  //       onError: (error: Error) => {
  //         // Check if it's a limit exceeded error
  //         if ((error as any).code === 'TTS_USAGE_LIMIT_EXCEEDED' || 
  //             error.message.includes('limit exceeded') ||
  //             error.message.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
  //           console.warn('[TTS Usage] Limit exceeded, stopping TTS:', error);
  //           // Stop TTS playback using ref
  //           if (handleStopTTSRef.current) {
  //             handleStopTTSRef.current();
  //           }
  //           // Show error toast
  //           addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
  //           // Dispatch event for subscription UI
  //           window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
  //             detail: { error: error.message }
  //           }));
  //           throw error; // Re-throw to prevent further processing
  //         }
  //         console.warn('[TTS Usage] Failed to record usage:', error);
  //       }
  //     });
  //   } catch (e: any) {
  //     // Check if it's a limit exceeded error
  //     if (e?.code === 'TTS_USAGE_LIMIT_EXCEEDED' || 
  //         e?.message?.includes('limit exceeded') ||
  //         e?.message?.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
  //       // Stop TTS and show error using ref
  //       if (handleStopTTSRef.current) {
  //         handleStopTTSRef.current();
  //       }
  //       addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
  //       window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
  //         detail: { error: e.message }
  //       }));
  //       throw e; // Re-throw to prevent further processing
  //     }
  //     console.warn('[TTS Usage] Failed to record usage:', e);
  //   }
  // }, [user?.id, addToast]);



  // === Usage recording helper - Enhanced with queue and retry ===
  const recordUsageSeconds = useCallback(async (
    seconds: number,
    options?: { skipLimitCheck?: boolean }
  ) => {
    if (!seconds || seconds <= 0) return;

    // Ensure we have a user ID or an anonymous session ID
    const currentUserId = user?.id;
    let currentSessionId: string | undefined;

    // Only try to get anonymous session if no user ID
    if (!currentUserId) {
      try {
        const { getAnonymousSessionId } = await import('../utils/anonymousSession');
        currentSessionId = getAnonymousSessionId();
      } catch (err) {
        console.warn('[TTS Usage] Failed to get anonymous session ID:', err);
      }

      if (!currentSessionId) {
        console.error('[TTS Usage] No userId or sessionId available to record usage.');
        return;
      }
    }

    try {
      // Ensure tracker is initialized and has correct user context
      // initializeUsageTracking handles both creation and updating userId on the singleton
      if (currentUserId) {
        await initializeUsageTracking(currentUserId);
      } else if (!getUsageTracker()) {
        await initializeUsageTracking(undefined);
      }

      let tracker = getUsageTracker();

      if (!tracker) {
        console.warn('[TTS Usage] Tracker not available, falling back to direct call');
        // Fallback to direct call if tracker unavailable
        const { supabase } = await import('../lib/supabase');

        if (currentUserId) {
          await supabase.rpc('increment_tts_usage', {
            p_user_id: currentUserId,
            p_seconds: seconds,
            p_source: 'reader'
          });
        } else if (currentSessionId) {
          await supabase.rpc('record_anonymous_tts_usage', {
            p_session_id: currentSessionId,
            p_seconds: seconds,
            p_source: 'reader',
            p_user_agent: navigator.userAgent
          });
        }
        return;
      }

      // Use enhanced tracker (handles queue, retry, circuit breaker)
      await tracker.recordUsageSeconds(seconds, 'reader', {
        sessionId: currentSessionId, // ✅ Pass session ID explicitly for anonymous users
        skipLimitCheck: options?.skipLimitCheck ?? false,  // ✅ Pass through skipLimitCheck
        onSuccess: () => {
          // console.log('[TTS Usage] Recorded successfully via enhanced tracker');
        },
        onError: (error: Error) => {
          // Check if it's a limit exceeded error
          if ((error as any).code === 'TTS_USAGE_LIMIT_EXCEEDED' ||
            error.message.includes('limit exceeded') ||
            error.message.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
            console.warn('[TTS Usage] Limit exceeded, stopping TTS:', error);
            // Stop TTS playback using ref
            if (handleStopTTSRef.current) {
              handleStopTTSRef.current();
            }
            // Show error toast
            addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
            // Dispatch event for subscription UI
            window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
              detail: { error: error.message }
            }));
            throw error; // Re-throw to prevent further processing
          }
          console.warn('[TTS Usage] Failed to record usage:', error);
        }
      });
    } catch (e: any) {
      // Check if it's a limit exceeded error
      if (e?.code === 'TTS_USAGE_LIMIT_EXCEEDED' ||
        e?.message?.includes('limit exceeded') ||
        e?.message?.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
        // Stop TTS and show error using ref
        if (handleStopTTSRef.current) {
          handleStopTTSRef.current();
        }
        addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
        window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
          detail: { error: e.message }
        }));
        throw e; // Re-throw to prevent further processing
      }
      console.warn('[TTS Usage] Failed to record usage:', e);
    }
  }, [user?.id, addToast]);



  // === Local Storage Helpers (using Repository) ===




  // === Cleanup audio on unmount or page change ===
  useEffect(() => {
    return () => {
      // Cleanup strategy
      if (playbackStrategyRef.current) {
        playbackStrategyRef.current.stop();
        playbackStrategyRef.current.cleanup();
      }

      // Cleanup HTML5 Audio
      if (audioRef.current) {
        // Remove event listeners before cleanup
        const handlers = (audioRef.current as any)?._handlers;
        if (handlers) {
          audioRef.current.removeEventListener('play', handlers.handlePlay);
          audioRef.current.removeEventListener('ended', handlers.handleEnded);
          audioRef.current.removeEventListener('error', handlers.handleError);
        }
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);


  // Handled by useTTSBuffering hook

  // === Buffering Logic moved to useTTSBuffering hook ===
  // clearAudioBuffer, cleanupOldChunks, and voice change effect removed
  // === fetchSingleChunk and prefetchChunks moved to useTTSBuffering hook ===

  // === Play chunk function ===
  const playChunk = useCallback(async (index: number) => {
    // Ensure playChunkRef is set immediately when playChunk is called
    // This guarantees it's available when handleEnded runs
    playChunkRef.current = playChunk;

    if (index < 0 || index >= chunks.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setHasFinishedPlayback(true);
      setCurrentChunkIndex(null);
      clearResumeIndex();
      ttsIntentActiveRef.current = false;
      isAutoAdvancingRef.current = false;
      isChunkPlayingRef.current = null;
      return;
    }

    // ✅ FIX: Track playing chunk to prevent duplicates
    isChunkPlayingRef.current = index;

    // Don't set currentChunkIndex here - it will be set when audio actually starts playing
    // This ensures the highlight updates exactly when audio starts, not when playChunk is called
    setIsSpeaking(true);
    setIsPaused(false);
    setHasFinishedPlayback(false);

    // Check if we should use seamless playback
    const strategy = playbackStrategyRef.current;
    const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';

    // Try seamless playback first if available and chunk is ready
    if (isSeamless && strategy) {
      // Get blob from chunk service
      const audioBlob = chunkServiceRef.getBlob(index);

      if (audioBlob) {
        try {
          // Strategy will handle seamless auto-advance via onChunkComplete handler
          await strategy.play(audioBlob, index);

          // ✅ Prefetch next chunk only (reduced to prevent buffer bloat)
          prefetchChunks(index + 1);
          return; // Success - seamless playback started
        } catch (error) {
          console.warn(`[playChunk] Seamless playback failed, falling back to HTML5:`, error);
          // Fall through to HTML5 Audio below
        }
      }
    }

    // HTML5 Audio fallback (original implementation)
    const playAudio = (audioUrl: string) => {
      // Clean up previous audio element if it exists
      if (audioRef.current) {
        // Remove all event listeners to prevent stale handlers
        const oldHandlers = (audioRef.current as any)?._handlers;
        if (oldHandlers) {
          audioRef.current.removeEventListener('play', oldHandlers.handlePlay);
          audioRef.current.removeEventListener('ended', oldHandlers.handleEnded);
          audioRef.current.removeEventListener('error', oldHandlers.handleError);
        }
        audioRef.current.pause();
        // Clear src to reset the element
        audioRef.current.src = '';
        audioRef.current = null;
      }

      // Create fresh audio element
      audioRef.current = new Audio();

      // Set up event handlers BEFORE setting src (more reliable)
      const handlePlay = () => {
        playStartTimeRef.current[index] = Date.now();
        // Update currentChunkIndex when audio actually starts playing
        // This ensures highlight is synchronized with audio playback
        setCurrentChunkIndex(index);
      };

      const handleEnded = async () => {

        // Calculate usage seconds
        const elapsed = playStartTimeRef.current[index] ? Math.round((Date.now() - playStartTimeRef.current[index]) / 1000) : 0;
        const seconds = (durationsBuffer.current[index] && durationsBuffer.current[index] > 0)
          ? durationsBuffer.current[index]
          : (elapsed > 0 ? elapsed : Math.round((audioRef.current as any)?.duration || 0));

        // ✅ DEBUG: Log seconds calculation for HTML5 playback

        // Use ref to ensure we always call the latest playChunk function
        // This fixes the stale closure issue when playChunk is recreated
        const nextChunkIndex = index + 1;

        // Check if there are more chunks to play
        if (nextChunkIndex < chunksRef.current.length) {
          // Set auto-advance flag to prevent handleNextSentence from pausing
          isAutoAdvancingRef.current = true;

          // ✅ CRITICAL FIX: Start next chunk IMMEDIATELY, don't wait for usage tracking
          // This eliminates the delay between chunks
          if (playChunkRef.current) {
            // Don't await - fire and continue to avoid blocking
            playChunkRef.current(nextChunkIndex).catch((error) => {
              console.error(`[playChunk] Error calling playChunkRef.current:`, error);
              isAutoAdvancingRef.current = false;
            });
          } else {
            console.error(`[playChunk] playChunkRef.current is null! Trying direct call to playChunk(${nextChunkIndex})`);
            // Fallback: call playChunk directly if ref is null (it's in closure scope)
            playChunk(nextChunkIndex).catch((error) => {
              console.error(`[playChunk] Error calling playChunk directly:`, error);
              isAutoAdvancingRef.current = false;
            });
          }

          // Clear auto-advance flag after a short delay to allow playChunk to start
          // This prevents handleNextSentence from interfering if called during transition
          setTimeout(() => {
            isAutoAdvancingRef.current = false;
          }, 100);

          // ✅ FIX: Determine if we should check limit (periodic check every 60 seconds)
          const now = Date.now();
          const timeSinceLastCheck = now - lastLimitCheckTimeRef.current;
          const shouldCheckLimit = timeSinceLastCheck > LIMIT_CHECK_INTERVAL_MS;

          if (shouldCheckLimit) {
            lastLimitCheckTimeRef.current = now;
          }

          // ✅ Track usage in BACKGROUND (non-blocking) - don't await before starting next chunk
          // Skip limit check if we just checked recently (cached result will be used)
          // Only stop playback if limit exceeded (handled in the catch block)
          recordUsageSeconds(seconds, {
            skipLimitCheck: !shouldCheckLimit  // ✅ Only check limit periodically
          }).catch((error: any) => {
            console.error(`[playChunk] Error recording usage seconds:`, error);
            // Stop playback if limit exceeded
            if (error?.code === 'TTS_USAGE_LIMIT_EXCEEDED' ||
              error?.message?.includes('limit exceeded') ||
              error?.message?.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
              console.warn('[TTS Usage] Limit exceeded, stopping TTS playback');
              if (handleStopTTSRef.current) {
                handleStopTTSRef.current();
              }
              addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
              window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
                detail: { error: error.message }
              }));
            } else {
              // For other errors (network issues, etc.), log but continue playback
              console.warn('[TTS Usage] Non-critical error, continuing playback:', error);
            }
          });
        } else {
          // End of chunks - playback complete
          setIsSpeaking(false);
          setIsPaused(false);
          setHasFinishedPlayback(true);
          setCurrentChunkIndex(null);
          clearResumeIndex();

          // Call the playback complete callback
          onPlaybackComplete?.();

          // Track final chunk usage (non-blocking)
          // Always check limit on final chunk to ensure we catch limit exceeded
          recordUsageSeconds(seconds, {
            skipLimitCheck: false  // ✅ Always check on final chunk
          }).catch((error: any) => {
            console.error(`[playChunk] Error recording final chunk usage:`, error);
          });
        }
      };

      const handleError = async (e: Event | Error) => {
        console.error(`[${readerInstanceId}][playChunk] Audio playback error:`, e);

        // ✅ NEW: Detect invalid blob URL errors and auto-retry with fresh fetch
        const error = e as any;
        // Handle both Event objects (from audio element) and Error objects (from playPromise)
        const errorName = error?.name || error?.target?.error?.name || '';
        const errorMessage = error?.message || error?.target?.error?.message || error?.target?.error?.code?.toString() || '';
        const isInvalidSource = errorName === 'NotSupportedError' ||
          errorName === 'MEDIA_ERR_SRC_NOT_SUPPORTED' ||
          errorMessage?.includes('no supported source') ||
          errorMessage?.includes('Failed to load') ||
          errorMessage?.includes('ERR_FILE_NOT_FOUND') ||
          errorMessage?.includes('ERR_UNKNOWN_URL_SCHEME');

        // Check if error occurred while using buffered audio
        if (isInvalidSource && audioBuffer.current[index]) {
          console.warn(`[playChunk] Blob URL for chunk #${index} is invalid, clearing buffer and retrying with fresh fetch`);

          // Clear the invalid blob URL
          const invalidUrl = audioBuffer.current[index];
          if (invalidUrl && invalidUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(invalidUrl);
            } catch (revokeError) {
              console.warn(`[playChunk] Failed to revoke invalid blob URL:`, revokeError);
            }
          }
          delete audioBuffer.current[index];

          // Retry by fetching fresh audio
          try {
            const textChunk = chunks[index];
            if (!textChunk) {
              throw new Error('No text chunk available for retry');
            }

            const ttsApiUrlForPlay = import.meta.env.VITE_TTS_API_URL || '';
            const apiUrlForPlay = ttsApiUrlForPlay ? `${ttsApiUrlForPlay}/api/tts` : '/api/tts';

            const params = new URLSearchParams({
              text: textChunk,
              voice: selectedVoiceRef.current,
              format: 'audio-24khz-48kbitrate-mono-mp3'
            });

            if (ttsSpeedRef.current !== 1) {
              const speedPercent = Math.round((ttsSpeedRef.current - 1) * 100);
              const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
              params.set('rate', speedParam);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let response;
            try {
              response = await fetch(`${apiUrlForPlay}?${params.toString()}`, {
                signal: controller.signal
              });
              clearTimeout(timeoutId);
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                throw new Error('TTS request timeout after 30 seconds');
              }
              throw fetchError;
            }

            if (!response.ok) {
              throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);
            }

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
              throw new Error(`Received empty audio blob for chunk #${index}`);
            }

            // Track duration
            try {
              const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
              const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
              durationsBuffer.current[index] = seconds;
            } catch { }

            const audioUrl = URL.createObjectURL(audioBlob);
            audioBuffer.current[index] = audioUrl;
            // bufferVoiceRef handled by useTTSBuffering hook

            // Retry playback with fresh audio

            // ✅ ZOMBIE RESURRECTION FIX: Check if we are still meant to be playing
            if (!ttsIntentActiveRef.current) {
              return;
            }

            playAudio(audioUrl);
            return; // Success - don't show error
          } catch (retryError) {
            console.error(`[playChunk] Retry failed for chunk #${index}:`, retryError);
            // Fall through to show error below
          }
        }

        // Original error handling for non-blob-URL errors or if retry failed
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentChunkIndex(null);
        ttsIntentActiveRef.current = false;
        addToast('Audio playback failed. If it does not work contact us.', 'error');
      };

      // Attach event listeners using addEventListener (more reliable than onXXX properties)
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('error', handleError);

      // Set src and playback properties
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = ttsSpeedRef.current;

      // Store handlers on the element for cleanup later (optional, for reference)
      (audioRef.current as any)._handlers = { handlePlay, handleEnded, handleError };

      // Start playback
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error(`[playChunk] Play failed for chunk #${index}:`, error);
          handleError(error as any);
        });
      }

      // ✅ Prefetch next chunk only (reduced to prevent buffer bloat)
      prefetchChunks(index + 1);
    };

    // ✅ FIX: Check if seamless is actively playing before creating HTML5 Audio
    const isSeamlessActive = isSeamless && strategy && (strategy.isPlaying() || strategy.isPaused());

    if (audioBuffer.current[index]) {
      const bufferedUrl = audioBuffer.current[index];
      if (bufferedUrl && bufferedUrl.startsWith('blob:')) {
        // If seamless is active, try seamless playback first (prevents double playback)
        if (isSeamlessActive && strategy) {
          try {
            // Get blob from buffer for seamless playback
            let audioBlob = chunkServiceRef.getBlob(index);
            if (!audioBlob) {
              // If blob not in chunk service, fetch it from blob URL
              const response = await fetch(bufferedUrl);
              audioBlob = await response.blob();
            }

            // Pre-decode and play with seamless
            await strategy.prepareChunk(index, audioBlob);
            await strategy.play(audioBlob, index);
            // ✅ Prefetch next chunk only (reduced to prevent buffer bloat)
            prefetchChunks(index + 1);
            return; // Success - seamless playback started, no HTML5 Audio
          } catch (error) {
            console.warn(`[playChunk] Seamless playback from buffer failed, falling back to HTML5:`, error);
            // Fall through to HTML5 Audio below
          }
        }

        // Use HTML5 Audio (either seamless not active, or seamless failed)
        playAudio(bufferedUrl);
      } else {
        delete audioBuffer.current[index];
      }
    }

    if (!audioBuffer.current[index]) {
      try {
        const textChunk = chunks[index];
        const ttsApiUrlForPlay = import.meta.env.VITE_TTS_API_URL || '';
        const apiUrlForPlay = ttsApiUrlForPlay ? `${ttsApiUrlForPlay}/api/tts` : '/api/tts';

        // Build query parameters with voice and speed
        const params = new URLSearchParams({
          text: textChunk,
          voice: selectedVoiceRef.current,
          format: 'audio-24khz-48kbitrate-mono-mp3'
        });

        // Add speed parameter if not 1 (normal speed)
        if (ttsSpeed !== 1) {
          const speedPercent = Math.round((ttsSpeed - 1) * 100);
          const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
          // Fix: Use set() instead of append() to avoid double encoding
          params.set('rate', speedParam);
        }

        // Add timeout protection to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

        let response;
        try {
          response = await fetch(`${apiUrlForPlay}?${params.toString()}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('TTS request timeout after 30 seconds');
          }
          throw fetchError; // Re-throw other errors
        }

        if (!response.ok) throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          throw new Error(`Received empty audio blob for chunk #${index}`);
        }

        // Track duration for this on-demand fetched chunk
        try {
          const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
          const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
          durationsBuffer.current[index] = seconds;
        } catch { }

        const audioUrl = URL.createObjectURL(audioBlob);
        audioBuffer.current[index] = audioUrl;


        // Try seamless playback first if available
        if (isSeamless && strategy) {
          try {
            // Pre-decode if not already done
            await strategy.prepareChunk(index, audioBlob);
            await strategy.play(audioBlob, index);
            // ✅ Prefetch next chunk only (reduced to prevent buffer bloat)
            prefetchChunks(index + 1);
            return; // Success - seamless playback started
          } catch (error) {
            console.warn(`[playChunk] Seamless playback failed, using HTML5:`, error);
            // Fall through to HTML5 Audio
          }
        }

        playAudio(audioUrl);
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error(`[${readerInstanceId}][playChunk] Error fetching/playing audio:`, error);
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentChunkIndex(null);
          ttsIntentActiveRef.current = false;

          // Show error toast
          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              addToast('TTS service is unavailable. If it does not work contact us.', 'error');
            } else if (error.message.includes('502')) {
              addToast('TTS server error. If it does not work contact us.', 'error');
            } else {
              addToast(`TTS error: ${error.message}. If it does not work contact us.`, 'error');
            }
          } else {
            addToast('TTS playback failed. If it does not work contact us.', 'error');
          }
        }
      }
    }
  }, [chunks, clearResumeIndex, prefetchChunks, readerInstanceId, ttsSpeed, addToast]);

  // Keep playChunkRef synchronized with playChunk function
  // This MUST run immediately after playChunk is defined to ensure it's available for audio handlers
  useEffect(() => {
    playChunkRef.current = playChunk;
  }, [playChunk, readerInstanceId]);

  // Keep chunksRef synchronized
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  // Set up event handlers for strategy (using refs to avoid stale closures)
  useEffect(() => {
    if (!playbackStrategyRef.current) return;

    playbackStrategyRef.current.setEventHandlers({
      onPlay: (chunkIndex: number) => {
        playStartTimeRef.current[chunkIndex] = Date.now();
        // ✅ FIX: Update playing chunk ref when audio actually starts
        isChunkPlayingRef.current = chunkIndex;
        // Update currentChunkIndex when audio actually starts playing
        // This ensures highlight is synchronized with audio playback
        setCurrentChunkIndex(chunkIndex);
      },

      onChunkComplete: async (chunkIndex: number) => {
        // Handle seamless auto-advance

        // Calculate usage seconds
        const elapsed = playStartTimeRef.current[chunkIndex] ? Math.round((Date.now() - playStartTimeRef.current[chunkIndex]) / 1000) : 0;
        const seconds = (durationsBuffer.current[chunkIndex] && durationsBuffer.current[chunkIndex] > 0)
          ? durationsBuffer.current[chunkIndex]
          : (elapsed > 0 ? elapsed : 0);

        // Determine if we should check limit (periodic check every 60 seconds)
        const now = Date.now();
        const timeSinceLastCheck = now - lastLimitCheckTimeRef.current;
        const shouldCheckLimit = timeSinceLastCheck > LIMIT_CHECK_INTERVAL_MS;

        if (shouldCheckLimit) {
          lastLimitCheckTimeRef.current = now;
        }

        // ✅ STEP 1: Determine next action and start playback IMMEDIATELY
        const nextChunkIndex = chunkIndex + 1;
        const hasNextChunk = nextChunkIndex < chunksRef.current.length;

        if (hasNextChunk && playChunkRef.current) {
          // Start next chunk without waiting
          isAutoAdvancingRef.current = true;
          playChunkRef.current(nextChunkIndex).catch((error) => {
            console.error(`[Strategy] Error in auto-advance:`, error);
            isAutoAdvancingRef.current = false;
          });
          setTimeout(() => {
            isAutoAdvancingRef.current = false;
          }, 100);
        }

        // ✅ STEP 2: Record usage in BACKGROUND (Fire-and-forget)
        // We do not await this, so it doesn't block the UI or audio
        recordUsageSeconds(seconds, {
          skipLimitCheck: !shouldCheckLimit
        }).catch((error: any) => {
          console.error(`[Strategy] Error recording usage seconds:`, error);

          // If limit exceeded, we must stop the playback we just started
          if (error?.code === 'TTS_USAGE_LIMIT_EXCEEDED' ||
            error?.message?.includes('limit exceeded') ||
            error?.message?.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
            console.warn('[TTS Usage] Limit exceeded, stopping TTS playback');

            // Stop the chunk we just started
            if (handleStopTTSRef.current) {
              handleStopTTSRef.current();
            }

            addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
            window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
              detail: { error: error.message }
            }));
          }
        });

        // ✅ STEP 3: Handle End of Book (if no next chunk)
        if (!hasNextChunk) {
          setIsSpeaking(false);
          setIsPaused(false);
          setHasFinishedPlayback(true);
          setCurrentChunkIndex(null);
          clearResumeIndex();

          onPlaybackComplete?.();
        }
      },
      onError: (error: Error) => {
        console.error(`[${readerInstanceId}][Strategy] Audio playback error:`, error);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentChunkIndex(null);
        ttsIntentActiveRef.current = false;
        addToast('Audio playback failed. If it does not work contact us.', 'error');
      },
    });
  }, [readerInstanceId, clearResumeIndex, recordUsageSeconds, addToast, chunksRef, setIsSpeaking, setIsPaused, setHasFinishedPlayback, setCurrentChunkIndex]);

  // Update playback rate when ttsSpeed changes
  useEffect(() => {
    if (playbackStrategyRef.current) {
      playbackStrategyRef.current.setPlaybackRate(ttsSpeed);
    }
  }, [ttsSpeed]);

  // === Pause playback ===
  const pausePlayback = useCallback(() => {
    console.log(`[${readerInstanceId}][pausePlayback] PAUSE CALLED - currentChunkIndex: ${currentChunkIndex}, isSpeaking: ${isSpeaking}`);

    // ✅ FIX: Update state IMMEDIATELY for responsive UI
    setIsPaused(true);
    setIsSpeaking(false);
    ttsIntentActiveRef.current = true;

    const strategy = playbackStrategyRef.current;

    // Try strategy first (seamless or HTML5)
    if (strategy && strategy.isPlaying()) {
      strategy.pause();

      if (currentChunkIndex !== null) {
        console.log(`[${readerInstanceId}][pausePlayback] Saving resumeIndex: ${currentChunkIndex}`);
        setResumeIndex(currentChunkIndex);
      }
      return;
    }

    // Fallback to HTML5 Audio
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();

      if (currentChunkIndex !== null) {
        console.log(`[${readerInstanceId}][pausePlayback] Saving resumeIndex: ${currentChunkIndex}`);
        setResumeIndex(currentChunkIndex);
      }
    } else {
      console.log(`[${readerInstanceId}][pausePlayback] No audio ref or not speaking - audioRef: ${!!audioRef.current}, isSpeaking: ${isSpeaking}`);
    }
  }, [isSpeaking, currentChunkIndex, readerInstanceId]);

  // === Resume playback ===
  const resumePlayback = useCallback(async () => {
    console.log(`[${readerInstanceId}][resumePlayback] RESUME CALLED - resumeIndex: ${resumeIndex}, isPaused: ${isPaused}, audioRef: ${!!audioRef.current}`);

    const strategy = playbackStrategyRef.current;

    // ✅ FIX: Prevent resuming if already playing the same chunk
    if (isChunkPlayingRef.current === resumeIndex && (isSpeaking || strategy?.isPlaying())) {
      console.log(`[${readerInstanceId}][resumePlayback] Already playing chunk ${resumeIndex}, skipping resume`);
      return;
    }

    // Try strategy first (seamless or HTML5)
    if (strategy && strategy.isPaused()) {
      try {
        await strategy.resume();
        setIsPaused(false);
        setIsSpeaking(true);
        ttsIntentActiveRef.current = true;
        // ✅ FIX: Update playing chunk ref to prevent duplicates
        if (resumeIndex !== null) {
          isChunkPlayingRef.current = resumeIndex;
        }
        return;
      } catch (error) {
        // If seamless resume fails (e.g., chunk evicted from queue), fallback to HTML5
        console.warn('[Resume] Strategy resume failed, falling back to HTML5:', error);
        // Don't return - continue to HTML5 fallback below
      }
    }

    // Fallback to HTML5 Audio
    if (audioRef.current && isPaused) {
      console.log(`[${readerInstanceId}][resumePlayback] Resuming existing audio`);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPaused(false);
            setIsSpeaking(true);
            ttsIntentActiveRef.current = true;
            // ✅ FIX: Update playing chunk ref
            if (resumeIndex !== null) {
              isChunkPlayingRef.current = resumeIndex;
            }
          })
          .catch((error) => {
            console.warn('Audio play failed:', error);
            setIsPaused(true);
            setIsSpeaking(false);
            ttsIntentActiveRef.current = false;
            isChunkPlayingRef.current = null;
            addToast('Failed to resume audio playback. If it does not work contact us.', 'error');
          });
      } else {
        setIsPaused(false);
        setIsSpeaking(true);
        ttsIntentActiveRef.current = true;
        if (resumeIndex !== null) {
          isChunkPlayingRef.current = resumeIndex;
        }
      }
    } else if (resumeIndex !== null) {
      // ✅ FIX: Only restart if not already playing this chunk
      if (isChunkPlayingRef.current !== resumeIndex) {
        // Fallback: If no audio ref or strategy resume failed, restart playback from saved index
        console.log(`[${readerInstanceId}][resumePlayback] Restarting playback from chunk ${resumeIndex}`);
        // Stop strategy if it's still active but in error state
        if (strategy && (strategy.isPlaying() || strategy.isPaused())) {
          strategy.stop();
        }
        isChunkPlayingRef.current = resumeIndex;
        playChunk(resumeIndex);
      } else {
        console.log(`[${readerInstanceId}][resumePlayback] Already playing chunk ${resumeIndex}, skipping restart`);
      }
    } else {
      console.log(`[${readerInstanceId}][resumePlayback] Cannot resume - resumeIndex: ${resumeIndex}, isPaused: ${isPaused}, audioRef: ${!!audioRef.current}`);
    }
  }, [isPaused, resumeIndex, isSpeaking, playChunk, readerInstanceId, addToast]);

  // === Halt playback (for navigation or stopping) ===
  const haltPlayback = useCallback(() => {
    const strategy = playbackStrategyRef.current;

    // ✅ FIX: Clear playing chunk ref
    isChunkPlayingRef.current = null;

    // Stop strategy first (seamless or HTML5)
    if (strategy && (strategy.isPlaying() || strategy.isPaused())) {
      strategy.stop();
    }

    // Fallback to HTML5 Audio cleanup
    if (audioRef.current) {
      // Remove event listeners before cleanup
      const handlers = (audioRef.current as any)?._handlers;
      if (handlers) {
        audioRef.current.removeEventListener('play', handlers.handlePlay);
        audioRef.current.removeEventListener('ended', handlers.handleEnded);
        audioRef.current.removeEventListener('error', handlers.handleError);
      }
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    clearAudioBuffer();

    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentChunkIndex(null);
  }, [readerInstanceId]);

  // === Handle user clicking the STOP button ===
  const handleStopTTS = useCallback(() => {
    haltPlayback();
    clearResumeIndex();
    ttsIntentActiveRef.current = false;
    // ✅ Reset buffered chunks count when stopping
    setBufferedChunksCount(0);
  }, [haltPlayback, clearResumeIndex]);

  // === Cleanup on unmount ===
  useEffect(() => {
    return () => {
      console.log(`[${readerInstanceId}] Reader unmounting, halting playback`);
      haltPlayback();
    };
  }, [haltPlayback, readerInstanceId]);

  // Update handleStopTTSRef when handleStopTTS changes
  useEffect(() => {
    handleStopTTSRef.current = handleStopTTS;
  }, [handleStopTTS]);

  // === Handle main TTS button pressed ===
  const handleTTS = useCallback(async (selectedTextOverride?: string | any) => {
    // ✅ FIX: Type guard FIRST - needed for pause/resume logic
    let textOverride: string | undefined;
    if (selectedTextOverride !== undefined) {
      if (typeof selectedTextOverride === 'string') {
        textOverride = selectedTextOverride;
      } else {
        console.log(`[${readerInstanceId}][handleTTS] Received non-string parameter (event object?), ignoring`);
        textOverride = undefined;
      }
    }

    console.log(`[${readerInstanceId}][handleTTS] TTS function called`, {
      isPaused,
      isSpeaking,
      hasCurrentPageText: !!currentPageText,
      chunksLength: chunks.length,
      hasTextOverride: !!textOverride
    });

    ttsIntentActiveRef.current = true;

    // ✅ FIX: Handle pause/resume IMMEDIATELY before any async operations
    // NEW: If text is provided and TTS is active, stop and restart from new position
    if (textOverride && (isSpeaking || isPaused)) {
      console.log(`[${readerInstanceId}][handleTTS] Stopping current playback to start from new selection`);
      haltPlayback(); // Stop current playback
      // Continue to start new playback below - will check limits
    }
    // Handle pause/resume for button clicks without text
    else if (isPaused) {
      // ✅ NEW: Debounce guard - prevent double resume within 300ms
      const now = Date.now();
      if (now - lastPauseResumeActionRef.current < 300) {
        console.log(`[${readerInstanceId}][handleTTS] Ignoring duplicate resume call (within 300ms)`);
        return; // Return immediately - no limit checks
      }
      lastPauseResumeActionRef.current = now;

      console.log(`[${readerInstanceId}][handleTTS] Resuming paused playback`);
      resumePlayback();
      return; // Return immediately - no limit checks
    }
    else if (isSpeaking) {
      // ✅ NEW: Debounce guard - prevent double pause within 300ms
      const now = Date.now();
      if (now - lastPauseResumeActionRef.current < 300) {
        console.log(`[${readerInstanceId}][handleTTS] Ignoring duplicate pause call (within 300ms)`);
        return; // Return immediately - no limit checks
      }
      lastPauseResumeActionRef.current = now;

      console.log(`[${readerInstanceId}][handleTTS] Pausing current playback`);
      pausePlayback();
      return; // Return immediately - no limit checks
    }

    // Return immediately if already playing or processing to prevent double-clicks
    if (isProcessing) {
      console.log(`[${readerInstanceId}][handleTTS] Ignoring call while processing`);
      return;
    }

    // Set processing state IMMEDIATELY to prevent multiple clicks
    if (!isPaused && !isSpeaking) {
      setIsProcessing(true);
    }

    // ✅ FIX: Usage limit checks ONLY for NEW playback (not for pause/resume)
    // Check anonymous limit BEFORE starting TTS
    if (anonymousLimit) {
      const canUseTTS = await anonymousLimit.checkLimit();
      if (!canUseTTS) {
        console.warn('[TTS] Anonymous limit reached, blocking TTS');
        addToast('Please sign up to continue using Read Aloud', 'info');
        setIsProcessing(false); // Reset state
        return; // Block TTS
      }
    }

    // ✅ FIXED: Refresh usage limit and check directly for authenticated users
    if (user?.id) {
      try {
        // Refresh the context first
        await refreshUsageLimit();

        // Fetch limit directly to get fresh data (context might not update immediately)
        const limitData = await fetchUsageLimit(user.id);

        if (limitData) {
          // Check if limit is exceeded (using same logic as SubscriptionContext)
          const limitExceeded = (limitData.limit_exceeded ?? false) ||
            (limitData.minutes_remaining !== null &&
              limitData.minutes_remaining < 1 &&
              (limitData.prepaid_minutes ?? 0) === 0);

          if (limitExceeded) {
            console.warn('[TTS] Authenticated user limit exceeded, blocking TTS');
            addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
            setIsProcessing(false); // Reset state
            return; // Block TTS
          }
        }
      } catch (limitError: any) {
        // ✅ NEW: If limit check fails (timeout, network error, etc.), log warning but allow TTS to proceed
        // This prevents TTS from being blocked when the limit service is unavailable
        console.warn('[TTS] Failed to check usage limit, allowing TTS to proceed:', limitError?.message || limitError);

        // Check if it's a session/auth error - might want to handle differently
        if (limitError?.message?.includes('Session refresh timeout') ||
          limitError?.message?.includes('Session expired')) {
          console.warn('[TTS] Session refresh failed, but allowing TTS to proceed. User may need to sign in again.');
          // Don't show error toast - just log and proceed
          // The usage will still be tracked, and limits will be enforced server-side
        } else {
          // For other errors (network, timeout), log but proceed
          console.warn('[TTS] Usage limit check failed, proceeding with TTS. Limits will be enforced server-side.');
        }
        // Continue to TTS - don't block on limit check failures
      }
    }

    // Check if currentPageText is ready
    if (!currentPageText || currentPageText.length === 0) {
      if (isPageLoading) {
        console.warn(`[${readerInstanceId}][handleTTS] Page is still loading...`);
        addToast?.('Page is loading, please wait...', 'info');
      } else {
        console.warn(`[${readerInstanceId}][handleTTS] currentPageText is empty (and not loading), likely scanned PDF or empty page`);
        addToast?.('No readable text found on this page. (Is this a scanned PDF?)', 'error');
      }
      setIsProcessing(false); // Reset state
      return;
    }

    let startChunk = 0;

    // Check for user-highlighted text first
    // Use override text if provided, otherwise check DOM selection
    const selection = window.getSelection();
    let selectedText: string | undefined;

    // Use the validated textOverride from the type guard above
    if (textOverride !== undefined) {
      selectedText = textOverride;
    } else {
      selectedText = selection?.toString().trim();
    }

    console.log(`[${readerInstanceId}][handleTTS] Selection check:`, {
      hasSelection: !!selection,
      selectedText: selectedText ? selectedText.substring(0, 50) : 'none', // ✅ Safe
      selectionLength: selectedText?.length,
      selectedTextType: typeof selectedText,
      hasOverride: textOverride !== undefined,
      overrideType: typeof textOverride,
      anchorNode: selection?.anchorNode,
      isInEpubContent: selection?.anchorNode?.parentElement?.closest('.epub-content') ? true : false
    });

    // Type guard: ensure selectedText is a non-empty string
    // If textOverride is provided, allow text matching even if DOM selection is cleared
    // (FloatingReadButton passes text but may clear selection)
    // If no override, require active DOM selection in epub-content (Controls button)
    const hasTextOverride = textOverride !== undefined;
    const hasValidDOMSelection = selection?.anchorNode?.parentElement?.closest('.epub-content');

    if (typeof selectedText === 'string' && selectedText.length > 0 &&
      (hasTextOverride || hasValidDOMSelection)) {

      console.log(`[${readerInstanceId}][handleTTS] Text matching enabled:`, {
        hasTextOverride,
        hasValidDOMSelection,
        selectedTextLength: selectedText.length,
        selectedTextPreview: selectedText.substring(0, 50),
        source: hasTextOverride ? 'FloatingReadButton (textOverride)' : 'Controls button (DOM selection)'
      });
      // Helper function to normalize text for comparison
      const normalizeText = (text: string): string => {
        return text
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ');
      };

      // Step 1: Try exact match FIRST (existing behavior)
      let startIndexInPage = currentPageText.indexOf(selectedText);

      console.log(`[${readerInstanceId}][handleTTS] Text matching attempt:`, {
        method: 'exact',
        found: startIndexInPage !== -1,
        index: startIndexInPage,
        pageTextLength: currentPageText.length,
        selectedTextLength: selectedText.length
      });

      // Step 2: ONLY if exact match fails, try normalized fallback
      if (startIndexInPage === -1 && currentPageText && selectedText) {
        try {
          const normalizedPageText = normalizeText(currentPageText);
          const normalizedSelection = normalizeText(selectedText);
          startIndexInPage = normalizedPageText.indexOf(normalizedSelection);

          if (startIndexInPage !== -1) {
            console.log(`[${readerInstanceId}][handleTTS] Found match using normalized text comparison`);
          } else {
            // Step 3: Try fuzzy matching with prefix (for longer selections)
            if (selectedText.length > 20) {
              const searchPrefix = normalizeText(selectedText.substring(0, 15));
              const fuzzyIndex = normalizedPageText.indexOf(searchPrefix);

              if (fuzzyIndex !== -1) {
                startIndexInPage = fuzzyIndex;
                console.log(`[${readerInstanceId}][handleTTS] Found match using fuzzy prefix matching (first 15 chars)`);
              }
            }

            if (startIndexInPage === -1) {
              console.warn(`[${readerInstanceId}][handleTTS] Could not find selected text even after normalization and fuzzy matching`, {
                pageTextLength: currentPageText.length,
                selectedTextLength: selectedText.length,
                pageTextPreview: currentPageText.substring(0, 100),
                selectedTextPreview: selectedText.substring(0, 100)
              });
            }
          }
        } catch (e) {
          console.error(`[${readerInstanceId}][handleTTS] Error in text comparison:`, e);
        }
      }

      // Step 4: Map found index to chunk
      if (startIndexInPage !== -1) {
        console.log(`[${readerInstanceId}][handleTTS] Text found in page content at index: ${startIndexInPage}. Mapping to chunk...`);
        let accumulatedLength = 0;
        let foundChunk = false;
        for (let i = 0; i < chunks.length; i++) {
          if (startIndexInPage < accumulatedLength + chunks[i].length) {
            startChunk = i;
            foundChunk = true;
            break;
          }
          accumulatedLength += chunks[i].length + 1;
        }
        if (foundChunk) {
          console.log(`[${readerInstanceId}][handleTTS] Successfully mapped text to chunk #${startChunk} (out of ${chunks.length} total chunks)`, {
            textIndex: startIndexInPage,
            chunkIndex: startChunk,
            source: hasTextOverride ? 'FloatingReadButton' : 'Controls button'
          });
          // Success feedback with type safety
          if (typeof selectedText === 'string') {
            const preview = selectedText.substring(0, 30);
            addToast?.(`Starting from: "${preview}${selectedText.length > 30 ? '...' : ''}"`, 'success');
          }
        } else {
          console.warn(`[${readerInstanceId}][handleTTS] Could not map selected text index ${startIndexInPage} to a chunk. Starting from beginning.`, {
            totalChunks: chunks.length,
            accumulatedLength,
            textIndex: startIndexInPage
          });
          addToast?.('Could not locate text position. Starting from beginning.', 'info');
        }
      } else {
        console.warn(`[${readerInstanceId}][handleTTS] Could not find selected text in page content after all matching attempts. Starting from beginning.`, {
          source: hasTextOverride ? 'FloatingReadButton' : 'Controls button',
          selectedTextLength: selectedText.length,
          pageTextLength: currentPageText.length,
          selectedTextPreview: selectedText.substring(0, 100),
          pageTextPreview: currentPageText.substring(0, 100)
        });
        addToast?.('Selected text not found. Starting from beginning of page.', 'info');
      }
    }
    // If no text is selected, try to use the resumeIndex from localStorage
    else if (resumeIndex !== null && resumeIndex >= 0) {
      // Logic update: resumeIndex is now Chunk Index, but might be Offset (legacy)
      // Heuristic: if resumeIndex > chunks.length, assume it's an offset
      if (resumeIndex < chunks.length) {
        startChunk = resumeIndex;
        console.log(`[${readerInstanceId}][handleTTS] Resuming from saved chunk #${startChunk}`);
      } else {
        // Legacy offset handling
        let accumulatedLength = 0;
        for (let i = 0; i < chunks.length; i++) {
          accumulatedLength += chunks[i].length + 1;
          if (resumeIndex < accumulatedLength) {
            startChunk = i;
            break;
          }
        }
        console.log(`[${readerInstanceId}][handleTTS] Resuming from saved offset ${resumeIndex}, mapped to chunk #${startChunk}`);
      }
    }
    else {
      console.log(`[${readerInstanceId}][handleTTS] No selection or resume index. Starting from beginning.`);
    }

    const startPlayback = async () => {
      console.log(`[${readerInstanceId}][handleTTS] Starting playback from chunk ${startChunk}`);
      // ✅ Reset buffered chunks count when starting new playback
      setBufferedChunksCount(0);
      setIsProcessing(true);

      // ✅ OPTIMISTIC PLAYBACK: Fetch first 2 chunks in parallel, then start playing immediately
      const firstChunkPromise = fetchSingleChunk(startChunk);
      const secondChunkPromise = startChunk + 1 < chunks.length
        ? fetchSingleChunk(startChunk + 1)
        : Promise.resolve();

      // Wait for first chunk to be ready, then start playing
      await firstChunkPromise;
      setIsProcessing(false);
      playChunk(startChunk);

      // Prefetch second chunk and remaining chunks in background (non-blocking)
      secondChunkPromise.catch(err =>
        console.warn('[handleTTS] Background prefetch of second chunk failed:', err)
      );
      // ✅ Only prefetch next chunks (reduced to prevent buffer bloat)
      prefetchChunks(startChunk + INITIAL_PREFETCH_COUNT).catch(err =>
        console.warn('[handleTTS] Background prefetch failed:', err)
      );
    };
    startPlayback();

  }, [isPaused, isSpeaking, resumeIndex, chunks, currentPageText, readerInstanceId, pausePlayback, resumePlayback, haltPlayback, playChunk, prefetchChunks, fetchSingleChunk, anonymousLimit, addToast, user?.id, refreshUsageLimit]);

  // === Save progress periodically on chunk change ===
  useEffect(() => {
    if (currentChunkIndex !== null && chunks.length > 0) {
      // Save current chunk index directly
      saveResumeIndex(currentChunkIndex);
      setHasFinishedPlayback(false);

      // Update highlighted content to show current chunk
      // DEFER heavy DOM/HTML processing to avoid blocking next chunk playback
      if (currentPageText && currentChunkIndex < chunks.length) {
        const currentChunk = chunks[currentChunkIndex];
        if (currentChunk) {
          // Use requestAnimationFrame to defer heavy work and let audio start first
          // This prevents blocking the next chunk from starting immediately
          requestAnimationFrame(() => {
            // Extract blob URLs from actual DOM before highlighting
            // This ensures images have blob URLs even if HTML string has about:blank
            const contentElement = document.querySelector('.epub-content');
            const blobUrlMap = new Map<string, string>();

            if (contentElement) {
              const images = contentElement.querySelectorAll('img[data-epub-src]');
              images.forEach((imgElement) => {
                const img = imgElement as HTMLImageElement;
                const epubSrc = img.getAttribute('data-epub-src');
                const src = img.getAttribute('src') || img.src;
                if (epubSrc && src && src.startsWith('blob:')) {
                  blobUrlMap.set(epubSrc, src);
                  console.log(`[useReaderTTS] Extracted blob URL for ${epubSrc}: ${src.substring(0, 50)}...`);
                } else {
                  console.warn(`[useReaderTTS] Image ${epubSrc} does not have blob URL, src: ${src}`);
                }
              });
            } else {
              console.warn('[useReaderTTS] Content element not found for blob URL extraction');
            }

            // Use HTML highlighting to preserve images and other HTML elements
            // Content-based matching finds chunks directly in HTML by text content
            // Pass blobUrlMap to ensure images have blob URLs from actual DOM

            // Debug: Check images in input HTML
            const inputImgRegex = /<img[^>]*>/gi;
            const inputImgMatches = currentContent.match(inputImgRegex) || [];
            const inputImageInfo = inputImgMatches.map(img => {
              const srcMatch = img.match(/src=["']([^"']+)["']/i);
              const epubSrcMatch = img.match(/data-epub-src=["']([^"']+)["']/i);
              return {
                fullTag: img.substring(0, 150),
                src: srcMatch ? srcMatch[1] : 'NO SRC',
                epubSrc: epubSrcMatch ? epubSrcMatch[1] : 'NO EPUB-SRC'
              };
            });

            const highlightedHtml = highlightChunkInHtml(
              currentContent,
              currentPageText,
              currentChunk,
              blobUrlMap,
              currentChunkIndex,
              chunks
            );

            // Debug: Check images in output HTML
            const outputImgRegex = /<img[^>]*>/gi;
            const outputImgMatches = highlightedHtml.match(outputImgRegex) || [];
            const outputImageInfo = outputImgMatches.map(img => {
              const srcMatch = img.match(/src=["']([^"']+)["']/i);
              const epubSrcMatch = img.match(/data-epub-src=["']([^"']+)["']/i);
              return {
                fullTag: img.substring(0, 150),
                src: srcMatch ? srcMatch[1] : 'NO SRC',
                epubSrc: epubSrcMatch ? epubSrcMatch[1] : 'NO EPUB-SRC'
              };
            });

            setHighlightedContent(highlightedHtml);
          });
        }
      }
    }
  }, [currentChunkIndex, chunks, saveResumeIndex, currentPageText, currentContent]);

  // === Monitor anonymous limit and stop TTS if exceeded during playback ===
  useEffect(() => {
    if (anonymousLimit?.isLimitReached && isSpeaking) {
      console.warn('[TTS] Limit exceeded during playback, stopping TTS');
      handleStopTTS();
      addToast('Free minutes exhausted. Please sign up to continue.', 'info');
      anonymousLimit.setShowLimitModal(true);
    }
  }, [anonymousLimit?.isLimitReached, isSpeaking, handleStopTTS, addToast, anonymousLimit]);

  // === Load resume index and highlight content ===
  useEffect(() => {
    const loadAndHighlight = async () => {
      const loadedIndex = await loadResumeIndex();
      setResumeIndex(loadedIndex);
      setHasFinishedPlayback(false);

      if (!currentPageText || loadedIndex === null) {
        setHighlightedContent(currentContent);
        return;
      }

      // Extract blob URLs from actual DOM before highlighting
      // This ensures images have blob URLs even if HTML string has about:blank
      const contentElement = document.querySelector('.epub-content');
      const blobUrlMap = new Map<string, string>();

      if (contentElement) {
        const images = contentElement.querySelectorAll('img[data-epub-src]');
        images.forEach((imgElement) => {
          const img = imgElement as HTMLImageElement;
          const epubSrc = img.getAttribute('data-epub-src');
          const src = img.getAttribute('src') || img.src;
          if (epubSrc && src && src.startsWith('blob:')) {
            blobUrlMap.set(epubSrc, src);
          }
        });
      }

      // For resume, we'll highlight the beginning of the text since we don't know the exact chunk
      // Use HTML highlighting to preserve images and other HTML elements
      // Pass blobUrlMap to ensure images have blob URLs from actual DOM
      const highlightLength = Math.min(100, currentPageText.length);
      const start = loadedIndex;
      const end = Math.min(start + highlightLength, currentPageText.length);

      const highlightedHtml = highlightTextInHtml(
        currentContent,
        currentPageText,
        start,
        end,
        blobUrlMap
      );
      setHighlightedContent(highlightedHtml);
    };

    loadAndHighlight();
  }, [loadResumeIndex, currentPageDisplay, currentContent, currentPageText]);

  // === Reset highlighted content when TTS stops ===
  useEffect(() => {
    if (!isSpeaking && !isProcessing && !isPaused) {
      // TTS is not active, show normal content
      setHighlightedContent(currentContent);
    }
  }, [isSpeaking, isProcessing, isPaused, currentContent]);







  // === Render content function moved back to Reader component (JSX not allowed in .ts files) ===

  // === Set playback rate for current audio ===
  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      console.log(`[${readerInstanceId}] Changed playback rate to ${rate}x`);
    }
  }, [readerInstanceId]);

  // === Computed values ===
  const canTTSResume = !!currentPageText && resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback;



  return {
    // States
    chunks,
    currentChunkIndex,
    isSpeaking,
    isProcessing,
    isPaused,
    resumeIndex,
    hasFinishedPlayback,
    useKokoroTTS,
    highlightedContent,
    bufferedChunksCount, // ✅ Buffering UI state

    // Controls
    handleTTS,
    handleStopTTS,
    pausePlayback,
    resumePlayback,

    // Navigation
    handleTTSNavigation,
    handlePreviousSentence,
    handleNextSentence,

    // Interactive Progress Bar handlers
    handlePreviewScroll,
    handleSeekToPercentage,

    // Audio control
    setPlaybackRate,

    // Computed
    canTTSResume,

    // Anonymous usage limit
    anonymousLimit,
  };
}; 