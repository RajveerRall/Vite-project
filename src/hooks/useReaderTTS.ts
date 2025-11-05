import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAnonymousUsageLimit } from './useAnonymousUsageLimit';
import { createTTSProgressRepository } from '../repositories/TTSProgressRepository';
import { createAdaptivePlaybackStrategy } from '../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../services/tts/strategies/IPlaybackStrategy';
import { createTTSChunkService } from '../services/tts/TTSChunkService';
import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';

// Helper: split text into sentence chunks
function splitTextIntoChunks(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(chunk => chunk.trim().length > 0);
}

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
}

// Constants moved to src/constants/tts.ts

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
  onPlaybackComplete
}: UseReaderTTSProps): UseReaderTTSReturn => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const anonymousLimit = useAnonymousUsageLimit();
  
  // Initialize progress repository
  const readerInstanceId = useRef(`ReaderInstance_${Date.now()}_${Math.random().toString(36).substring(2,7)}`).current;
  const progressRepository = useRef(createTTSProgressRepository(readerInstanceId)).current;
  
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
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false);
  const [useKokoroTTS] = useState<boolean>(false);
  const [highlightedContent, setHighlightedContent] = useState<string>(currentContent);

  // === Refs ===
  const audioBuffer = useRef<Record<number, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsIntentActiveRef = useRef(false);
  const currentTTSBaseOffsetRef = useRef<number>(0);
  // === Usage Tracking Refs ===
  const durationsBuffer = useRef<Record<number, number>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playStartTimeRef = useRef<Record<number, number>>({});
  // === Voice tracking for buffer validation ===
  const bufferVoiceRef = useRef<string>(selectedVoice);
  // === Ref for selectedVoice to avoid stale closures ===
  const selectedVoiceRef = useRef<string>(selectedVoice);
  // === Ref for ttsSpeed to avoid stale closures ===
  const ttsSpeedRef = useRef<number>(ttsSpeed);
  // === Track previous voice to detect actual changes ===
  const prevVoiceRef = useRef<string>(selectedVoice);
  // === Track last pause/resume action to prevent double-calls ===
  const lastPauseResumeActionRef = useRef<number>(0);
  // === Ref for playChunk to avoid stale closures in onended handlers ===
  const playChunkRef = useRef<((index: number) => Promise<void>) | null>(null);
  // === Flag to track auto-advance vs manual navigation ===
  const isAutoAdvancingRef = useRef<boolean>(false);
  // === Ref for handleStopTTS to avoid circular dependency ===
  const handleStopTTSRef = useRef<(() => void) | null>(null);

  // === Keep selectedVoiceRef synchronized with selectedVoice prop ===
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
    console.log(`[${readerInstanceId}][Voice Ref Sync] selectedVoiceRef updated to: ${selectedVoice}`);
  }, [selectedVoice, readerInstanceId]);

  // === Keep ttsSpeedRef synchronized with ttsSpeed prop ===
  useEffect(() => {
    ttsSpeedRef.current = ttsSpeed;
    console.log(`[${readerInstanceId}][Speed Ref Sync] ttsSpeedRef updated to: ${ttsSpeed}x`);
  }, [ttsSpeed, readerInstanceId]);

  // === Usage recording helper - Enhanced with queue and retry ===
  const recordUsageSeconds = useCallback(async (seconds: number) => {
    if (!seconds || seconds <= 0) return;
    
    try {
      // Use enhanced usage tracker with queue and retry
      
      // Ensure tracker is initialized
      let tracker = getUsageTracker();
      if (!tracker) {
        await initializeUsageTracking(user?.id);
        tracker = getUsageTracker();
      }
      
      if (!tracker) {
        console.warn('[TTS Usage] Tracker not available, falling back to direct call');
        // Fallback to direct call if tracker unavailable
        const { supabase } = await import('../lib/supabase');
        const { getAnonymousSessionId } = await import('../utils/anonymousSession');
        
        if (user?.id) {
          await supabase.rpc('increment_tts_usage', {
            p_user_id: user.id,
            p_seconds: seconds,
            p_source: 'reader'
          });
        } else {
          const sessionId = getAnonymousSessionId();
          await supabase.rpc('record_anonymous_tts_usage', {
            p_session_id: sessionId,
            p_seconds: seconds,
            p_source: 'reader',
            p_user_agent: navigator.userAgent
          });
        }
        return;
      }
      
      // Use enhanced tracker (handles queue, retry, circuit breaker)
      await tracker.recordUsageSeconds(seconds, 'reader', {
        onSuccess: () => {
          console.log('[TTS Usage] Recorded successfully via enhanced tracker');
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

  // Decode an audio Blob once to get duration in seconds (fallback if server doesn't send header)
  const getBlobDurationSeconds = useCallback(async (blob: Blob): Promise<number> => {
    try {
      if (!audioCtxRef.current) {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return 0;
        audioCtxRef.current = new Ctx();
      }
      const arrayBuf = await blob.arrayBuffer();
      const audioBuf = await new Promise<AudioBuffer>((resolve, reject) => {
        audioCtxRef.current!.decodeAudioData(arrayBuf, resolve, reject);
      });
      return Math.max(0, Math.round(audioBuf.duration));
    } catch {
      return 0;
    }
  }, []);

  // === Local Storage Helpers (using Repository) ===
  const saveResumeIndex = useCallback(async (index: number) => {
    try {
      await progressRepository.saveResumeIndex(bookTitle, currentPageDisplay, index);
    } catch (error) {
      console.error(`[${readerInstanceId}][TTS Resume Save] Error:`, error);
    }
  }, [bookTitle, currentPageDisplay, progressRepository, readerInstanceId]);

  const loadResumeIndex = useCallback(async (): Promise<number | null> => {
    try {
      return await progressRepository.loadResumeIndex(bookTitle, currentPageDisplay, currentPageText?.length || 0);
    } catch (error) {
      console.error(`[${readerInstanceId}][TTS Resume Load] Error:`, error);
      return null;
    }
  }, [bookTitle, currentPageDisplay, currentPageText?.length, progressRepository, readerInstanceId]);

  const clearResumeIndex = useCallback(async () => {
    try {
      await progressRepository.clearResumeIndex(bookTitle, currentPageDisplay);
    } catch (error) {
      console.error(`[${readerInstanceId}][TTS Resume Clear] Error:`, error);
    }
    setResumeIndex(null);
    setHasFinishedPlayback(true);
    currentTTSBaseOffsetRef.current = 0;
  }, [bookTitle, currentPageDisplay, progressRepository, readerInstanceId]);

  // === Split text into chunks whenever currentPageText changes ===
  useEffect(() => {
    if (currentPageText) {
      const newChunks = splitTextIntoChunks(currentPageText);
      console.log(`[TTS] Split text into ${newChunks.length} chunks:`, {
        textLength: currentPageText.length,
        firstChunk: newChunks[0]?.substring(0, 100),
        lastChunk: newChunks[newChunks.length - 1]?.substring(0, 100)
      });
      setChunks(newChunks);
      setCurrentChunkIndex(null);
      setIsSpeaking(false);
      setIsPaused(false);
      setIsProcessing(false);
      setHasFinishedPlayback(false);
      currentTTSBaseOffsetRef.current = 0;
      ttsIntentActiveRef.current = false;
    } else {
      setChunks([]);
    }
  }, [currentPageText]);

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

  // === Cleanup for all buffered audio blobs on unmount ===
  useEffect(() => {
    return () => {
      Object.values(audioBuffer.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  // === Clear audio buffer function ===
  const clearAudioBuffer = useCallback(() => {
    const bufferUrls = Object.values(audioBuffer.current);
    console.log(`[${readerInstanceId}][clearAudioBuffer] Clearing ${bufferUrls.length} buffered audio URLs due to voice change`);
    bufferUrls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    audioBuffer.current = {};
    // Update the voice tracking ref
    bufferVoiceRef.current = selectedVoiceRef.current;
  }, [readerInstanceId]);

  // === Handle voice changes during playback ===
  useEffect(() => {
    console.log(`[${readerInstanceId}][Voice Change Effect] selectedVoice changed to: ${selectedVoice}, isSpeaking: ${isSpeaking}, isPaused: ${isPaused}, isProcessing: ${isProcessing}`);
    
    // Only clear buffer if voice actually changed (not just effect re-running due to state changes)
    if ((isSpeaking || isPaused || isProcessing) && 
        Object.keys(audioBuffer.current).length > 0 &&
        prevVoiceRef.current !== selectedVoice) {
      console.log(`[${readerInstanceId}][Voice Change] Voice changed from ${prevVoiceRef.current} to ${selectedVoice} during active playback - clearing buffer`);
      clearAudioBuffer();
    }
    
    // Update previous voice ref after checking
    prevVoiceRef.current = selectedVoice;
  }, [selectedVoice, isSpeaking, isPaused, isProcessing, clearAudioBuffer, readerInstanceId]);

  // === Prefetch chunks function ===
  const prefetchChunks = useCallback(async (startIndex: number) => {
    const chunksToFetch = chunks.slice(startIndex, startIndex + 2);
    if (chunksToFetch.length === 0) return;

    console.log(`[Prefetch] Starting pre-fetch for chunks from index ${startIndex}`);

    // Check if using seamless playback
    const strategy = playbackStrategyRef.current;
    const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';

    for (let i = 0; i < chunksToFetch.length; i++) {
      const chunkIndex = startIndex + i;
      if (audioBuffer.current[chunkIndex] || currentChunkIndex === chunkIndex) continue;

      try {
        const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
        const textChunk = chunksToFetch[i];
        const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
        
        const params = new URLSearchParams({
          text: textChunk,
          voice: selectedVoiceRef.current,
          format: 'audio-24khz-48kbitrate-mono-mp3'
        });
        
        if (ttsSpeed !== 1) {
          const speedPercent = Math.round((ttsSpeed - 1) * 100);
          const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
          params.set('rate', speedParam);
        }
        
        let response = await fetch(`${apiUrl}?${params.toString()}`);
        
        if (!response.ok) continue;

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          console.warn(`[Prefetch] Received empty audio blob for chunk #${chunkIndex}. Skipping.`);
          continue;
        }

        // Track duration for this prefetched chunk
        try {
          const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
          const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
          durationsBuffer.current[chunkIndex] = seconds;
        } catch {}

        // Store blob URL for HTML5 playback (fallback)
        const audioUrl = URL.createObjectURL(audioBlob);
        audioBuffer.current[chunkIndex] = audioUrl;
        bufferVoiceRef.current = selectedVoiceRef.current;

        // ✅ SEAMLESS INTEGRATION: Pre-decode for Web Audio API if using seamless playback
        if (isSeamless && strategy) {
          try {
            await strategy.prepareChunk(chunkIndex, audioBlob);
            console.log(`[Prefetch] Pre-decoded chunk #${chunkIndex} for seamless playback`);
          } catch (error) {
            console.warn(`[Prefetch] Failed to pre-decode chunk #${chunkIndex} for seamless playback:`, error);
            // Continue with HTML5 fallback
          }
        }

        console.log(`[Prefetch] Successfully buffered chunk #${chunkIndex} with voice ${selectedVoiceRef.current}`);

      } catch (error) {
        console.warn(`[Prefetch] Failed to pre-fetch chunk #${chunkIndex}`, error);
        addToast(`Failed to pre-fetch audio chunk ${chunkIndex + 1}. If it does not work contact us.`, 'error');
      }
    }
  }, [chunks, currentChunkIndex, ttsSpeed, addToast]);

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
      return;
    }

    setCurrentChunkIndex(index);
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
          console.log(`[playChunk] Attempting seamless playback for chunk #${index}`);
          // Strategy will handle seamless auto-advance via onChunkComplete handler
          await strategy.play(audioBlob, index);
          
          // Prefetch next chunks
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
        console.log(`[playChunk] Audio started playing chunk #${index}`);
      };
      
      const handleEnded = async () => {
        console.log(`[playChunk] Audio ended for chunk #${index}, advancing to chunk #${index + 1}`);
        
        // Calculate usage seconds
        const elapsed = playStartTimeRef.current[index] ? Math.round((Date.now() - playStartTimeRef.current[index]) / 1000) : 0;
        const seconds = (durationsBuffer.current[index] && durationsBuffer.current[index] > 0)
          ? durationsBuffer.current[index]
          : (elapsed > 0 ? elapsed : Math.round((audioRef.current as any)?.duration || 0));
        
        // ✅ CRITICAL FIX: Make usage tracking non-blocking (fire-and-forget)
        // Remove await to prevent blocking the next chunk
        recordUsageSeconds(seconds).catch((error) => {
          console.error(`[playChunk] Error recording usage seconds:`, error);
          // Silently continue - usage tracking shouldn't interrupt playback
        });
        
        // Use ref to ensure we always call the latest playChunk function
        // This fixes the stale closure issue when playChunk is recreated
        const nextChunkIndex = index + 1;
        
        // Check if there are more chunks to play
        if (nextChunkIndex < chunksRef.current.length) {
          // Set auto-advance flag to prevent handleNextSentence from pausing
          isAutoAdvancingRef.current = true;
          console.log(`[playChunk] Auto-advance flag set to true`);
          
          if (playChunkRef.current) {
            console.log(`[playChunk] playChunkRef.current is available, calling playChunkRef.current(${nextChunkIndex})`);
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
            console.log(`[playChunk] Auto-advance flag cleared`);
          }, 100);
        } else {
          // End of chunks - playback complete
          console.log(`[playChunk] Reached end of all chunks, playback complete`);
          setIsSpeaking(false);
          setIsPaused(false);
          setHasFinishedPlayback(true);
          setCurrentChunkIndex(null);
          clearResumeIndex();
          
          // Call the playback complete callback
          onPlaybackComplete?.();
        }
      };
      
      const handleError = (e: Event) => {
        console.error(`[${readerInstanceId}][playChunk] Audio playback error:`, e);
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
      console.log(`[playChunk] Set src and playback rate: ${ttsSpeedRef.current}x for chunk #${index}`);
      
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
      
      prefetchChunks(index + 1);
    };

    // ✅ FIX: Check if seamless is actively playing before creating HTML5 Audio
    const isSeamlessActive = isSeamless && strategy && (strategy.isPlaying() || strategy.isPaused());
    
    if (audioBuffer.current[index]) {
      const bufferedUrl = audioBuffer.current[index];
      if (bufferedUrl && bufferedUrl.startsWith('blob:') && bufferVoiceRef.current === selectedVoiceRef.current) {
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
            console.log(`[playChunk] Pre-decoded chunk #${index} from buffer for seamless playback`);
            await strategy.play(audioBlob, index);
            prefetchChunks(index + 1);
            return; // Success - seamless playback started, no HTML5 Audio
          } catch (error) {
            console.warn(`[playChunk] Seamless playback from buffer failed, falling back to HTML5:`, error);
            // Fall through to HTML5 Audio below
          }
        }
        
        // Use HTML5 Audio (either seamless not active, or seamless failed)
        console.log(`[playChunk] Playing chunk #${index} from BUFFER with voice ${selectedVoiceRef.current}.`);
        playAudio(bufferedUrl);
      } else {
        console.log(`[playChunk] Buffered URL for chunk #${index} is invalid or voice mismatch (buffer: ${bufferVoiceRef.current}, current: ${selectedVoiceRef.current}), fetching from NETWORK.`);
        delete audioBuffer.current[index];
      }
    }
    
    if (!audioBuffer.current[index]) {
      console.log(`[playChunk] Playing chunk #${index} from NETWORK.`);
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
        
        let response = await fetch(`${apiUrlForPlay}?${params.toString()}`);
        
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
        } catch {}

        const audioUrl = URL.createObjectURL(audioBlob);
        audioBuffer.current[index] = audioUrl;
        // Track the voice used for this on-demand chunk
        bufferVoiceRef.current = selectedVoiceRef.current;
        
        // Try seamless playback first if available
        if (isSeamless && strategy) {
          try {
            // Pre-decode if not already done
            await strategy.prepareChunk(index, audioBlob);
            console.log(`[playChunk] Pre-decoded chunk #${index} for seamless playback`);
            await strategy.play(audioBlob, index);
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
    console.log(`[${readerInstanceId}][playChunkRef] Synchronized playChunkRef with playChunk function`);
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
        console.log(`[Strategy] Audio started playing chunk #${chunkIndex}`);
      },
      onChunkComplete: (chunkIndex: number) => {
        // Handle seamless auto-advance
        console.log(`[Strategy] Audio ended for chunk #${chunkIndex}, advancing to chunk #${chunkIndex + 1}`);
        
        // Calculate usage seconds
        const elapsed = playStartTimeRef.current[chunkIndex] ? Math.round((Date.now() - playStartTimeRef.current[chunkIndex]) / 1000) : 0;
        const seconds = (durationsBuffer.current[chunkIndex] && durationsBuffer.current[chunkIndex] > 0)
          ? durationsBuffer.current[chunkIndex]
          : (elapsed > 0 ? elapsed : 0);
        
        // ✅ CRITICAL FIX: Make usage tracking non-blocking (fire-and-forget)
        recordUsageSeconds(seconds).catch((error) => {
          console.error(`[Strategy] Error recording usage seconds:`, error);
        });
        
        // Auto-advance to next chunk
        const nextChunkIndex = chunkIndex + 1;
        if (nextChunkIndex < chunksRef.current.length && playChunkRef.current) {
          isAutoAdvancingRef.current = true;
          playChunkRef.current(nextChunkIndex).catch((error) => {
            console.error(`[Strategy] Error in auto-advance:`, error);
            isAutoAdvancingRef.current = false;
          });
          setTimeout(() => {
            isAutoAdvancingRef.current = false;
          }, 100);
        } else {
          // End of chunks
          setIsSpeaking(false);
          setIsPaused(false);
          setHasFinishedPlayback(true);
          setCurrentChunkIndex(null);
          clearResumeIndex();
          
          // Call the playback complete callback
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
    
    const strategy = playbackStrategyRef.current;
    
    // Try strategy first (seamless or HTML5)
    if (strategy && strategy.isPlaying()) {
      strategy.pause();
      setIsPaused(true);
      setIsSpeaking(false);
      ttsIntentActiveRef.current = true;
      
      if (currentChunkIndex !== null) {
        console.log(`[${readerInstanceId}][pausePlayback] Saving resumeIndex: ${currentChunkIndex}`);
        setResumeIndex(currentChunkIndex);
      }
      return;
    }
    
    // Fallback to HTML5 Audio
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
      ttsIntentActiveRef.current = true;
      
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
    
    // Try strategy first (seamless or HTML5)
    if (strategy && strategy.isPaused()) {
      try {
        await strategy.resume();
        setIsPaused(false);
        setIsSpeaking(true);
        ttsIntentActiveRef.current = true;
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
          })
          .catch((error) => {
            console.warn('Audio play failed:', error);
            setIsPaused(true);
            setIsSpeaking(false);
            ttsIntentActiveRef.current = false;
            addToast('Failed to resume audio playback. If it does not work contact us.', 'error');
          });
      } else {
        setIsPaused(false);
        setIsSpeaking(true);
        ttsIntentActiveRef.current = true;
      }
    } else if (resumeIndex !== null) {
      // Fallback: If no audio ref or strategy resume failed, restart playback from saved index
      console.log(`[${readerInstanceId}][resumePlayback] Restarting playback from chunk ${resumeIndex}`);
      // Stop strategy if it's still active but in error state
      if (strategy && (strategy.isPlaying() || strategy.isPaused())) {
        strategy.stop();
      }
      playChunk(resumeIndex);
    } else {
      console.log(`[${readerInstanceId}][resumePlayback] Cannot resume - resumeIndex: ${resumeIndex}, isPaused: ${isPaused}, audioRef: ${!!audioRef.current}`);
    }
  }, [isPaused, resumeIndex, playChunk, readerInstanceId, addToast]);

  // === Halt playback (for navigation or stopping) ===
  const haltPlayback = useCallback(() => {
    const strategy = playbackStrategyRef.current;
    
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
    
    const bufferUrls = Object.values(audioBuffer.current);
    console.log(`[${readerInstanceId}][haltPlayback] Clearing ${bufferUrls.length} buffered audio URLs`);
    bufferUrls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    audioBuffer.current = {};
    
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentChunkIndex(null);
  }, [readerInstanceId]);

  // === Handle user clicking the STOP button ===
  const handleStopTTS = useCallback(() => {
    haltPlayback();
    clearResumeIndex();
    ttsIntentActiveRef.current = false;
  }, [haltPlayback, clearResumeIndex]);

  // Update handleStopTTSRef when handleStopTTS changes
  useEffect(() => {
    handleStopTTSRef.current = handleStopTTS;
  }, [handleStopTTS]);

  // === Handle main TTS button pressed ===
  const handleTTS = useCallback(async (selectedTextOverride?: string | any) => {
    // Check anonymous limit BEFORE starting TTS
    if (anonymousLimit) {
      const canUseTTS = await anonymousLimit.checkLimit();
      if (!canUseTTS) {
        console.warn('[TTS] Anonymous limit reached, blocking TTS');
        addToast('Please sign up to continue using Read Aloud', 'info');
        return; // Block TTS
      }
    }
    
    // Type guard: Only accept string overrides
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

    // NEW: If text is provided and TTS is active, stop and restart from new position
    if (textOverride && (isSpeaking || isPaused)) {
      console.log(`[${readerInstanceId}][handleTTS] Stopping current playback to start from new selection`);
      haltPlayback(); // Stop current playback
      // Continue to start new playback below
    }
    // Handle pause/resume for button clicks without text
    else if (isPaused) {
      // ✅ NEW: Debounce guard - prevent double resume within 300ms
      const now = Date.now();
      if (now - lastPauseResumeActionRef.current < 300) {
        console.log(`[${readerInstanceId}][handleTTS] Ignoring duplicate resume call (within 300ms)`);
        return;
      }
      lastPauseResumeActionRef.current = now;
      
      console.log(`[${readerInstanceId}][handleTTS] Resuming paused playback`);
      resumePlayback();
      return;
    }
    else if (isSpeaking) {
      // ✅ NEW: Debounce guard - prevent double pause within 300ms
      const now = Date.now();
      if (now - lastPauseResumeActionRef.current < 300) {
        console.log(`[${readerInstanceId}][handleTTS] Ignoring duplicate pause call (within 300ms)`);
        return;
      }
      lastPauseResumeActionRef.current = now;
      
      console.log(`[${readerInstanceId}][handleTTS] Pausing current playback`);
      pausePlayback();
      return;
    }

    // Check if currentPageText is ready
    if (!currentPageText || currentPageText.length === 0) {
      console.warn(`[${readerInstanceId}][handleTTS] currentPageText is empty, cannot process selection`);
      addToast?.('Page content not ready. Please wait a moment and try again.', 'error');
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
    if (typeof selectedText === 'string' && selectedText.length > 0 && 
        selection?.anchorNode?.parentElement?.closest('.epub-content')) {
      // Helper function to normalize text for comparison
      const normalizeText = (text: string): string => {
        return text
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ');
      };

      // Step 1: Try exact match FIRST (existing behavior)
      let startIndexInPage = currentPageText.indexOf(selectedText);

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
        console.log(`[${readerInstanceId}][handleTTS] User selected text. Index: ${startIndexInPage}.`);
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
          console.log(`[${readerInstanceId}][handleTTS] Starting from selected text in chunk #${startChunk}.`);
          // Success feedback with type safety
          if (typeof selectedText === 'string') {
            const preview = selectedText.substring(0, 30);
            addToast?.(`Starting from: "${preview}${selectedText.length > 30 ? '...' : ''}"`, 'success');
          }
        } else {
          console.warn(`[${readerInstanceId}][handleTTS] Could not map selected text to a chunk. Starting from beginning.`);
          addToast?.('Could not locate text position. Starting from beginning.', 'info');
        }
      } else {
        console.warn(`[${readerInstanceId}][handleTTS] Could not find selected text in page content. Starting from beginning.`);
        addToast?.('Selected text not found. Starting from beginning of page.', 'info');
      }
    }
    // If no text is selected, try to use the resumeIndex from localStorage
    else if (resumeIndex !== null && resumeIndex >= 0) {
      let accumulatedLength = 0;
      for (let i = 0; i < chunks.length; i++) {
        accumulatedLength += chunks[i].length + 1;
        if (resumeIndex < accumulatedLength) {
          startChunk = i;
          break;
        }
      }
      console.log(`[${readerInstanceId}][handleTTS] Resuming from saved index ${resumeIndex}, which corresponds to chunk #${startChunk}.`);
    }
    else {
      console.log(`[${readerInstanceId}][handleTTS] No selection or resume index. Starting from beginning.`);
    }

    const startPlayback = async () => {
      console.log(`[${readerInstanceId}][handleTTS] Starting playback from chunk ${startChunk}`);
      setIsProcessing(true); 
      await prefetchChunks(startChunk);
      setIsProcessing(false);
      playChunk(startChunk);
    };
    startPlayback();

  }, [isPaused, isSpeaking, resumeIndex, chunks, currentPageText, readerInstanceId, pausePlayback, resumePlayback, playChunk, prefetchChunks, anonymousLimit, addToast]);

  // === Save progress periodically on chunk change ===
  useEffect(() => {
    console.log(`[TTS] Chunk change effect triggered:`, {
      currentChunkIndex,
      chunksLength: chunks.length,
      hasCurrentPageText: !!currentPageText
    });
    
    if (currentChunkIndex !== null && chunks.length > 0) {
      let offset = 0;
      for (let i = 0; i < currentChunkIndex; i++) {
        offset += chunks[i].length + 1;
      }
      currentTTSBaseOffsetRef.current = offset;
      saveResumeIndex(offset);
      setHasFinishedPlayback(false);
      
      // Update highlighted content to show current chunk
      if (currentPageText && currentChunkIndex < chunks.length) {
        const currentChunk = chunks[currentChunkIndex];
        if (currentChunk) {
          // Find the current chunk in the full text and highlight it
          const chunkIndex = currentPageText.indexOf(currentChunk);
          if (chunkIndex !== -1) {
            const escapeHtml = (str: string) =>
              str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

            const before = escapeHtml(currentPageText.substring(0, chunkIndex));
            const highlight = escapeHtml(currentChunk);
            const after = escapeHtml(currentPageText.substring(chunkIndex + currentChunk.length));

            const highlightedHtml = `${before}<span class="tts-highlight">${highlight}</span>${after}`;
            setHighlightedContent(highlightedHtml);
            console.log(`[DEBUG] Updated highlightedContent for chunk ${currentChunkIndex}:`, {
              chunkIndex,
              chunkLength: currentChunk.length,
              chunkPreview: currentChunk.substring(0, 50),
              highlightedContentLength: highlightedHtml.length,
              hasHighlightSpan: highlightedHtml.includes('<span class="tts-highlight">')
            });
          }
        }
      }
    }
  }, [currentChunkIndex, chunks, saveResumeIndex, currentPageText]);

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

      // For resume, we'll highlight the beginning of the text since we don't know the exact chunk
      const highlightLength = Math.min(100, currentPageText.length);
      const start = loadedIndex;
      const end = Math.min(start + highlightLength, currentPageText.length);

      const escapeHtml = (str: string) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const before = escapeHtml(currentPageText.substring(0, start));
      const highlight = escapeHtml(currentPageText.substring(start, end));
      const after = escapeHtml(currentPageText.substring(end));

      const highlightedHtml = `${before}<span class="tts-highlight">${highlight}</span>${after}`;
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

  // === Handle stopping playback on page navigation ===
  const handleTTSNavigation = useCallback(() => {
    if (ttsIntentActiveRef.current && (isSpeaking || isPaused)) {
      saveResumeIndex(currentTTSBaseOffsetRef.current);
    }
    haltPlayback();
    ttsIntentActiveRef.current = false;
  }, [isSpeaking, isPaused, saveResumeIndex, haltPlayback]);

  // === Previous/Next Sentence Navigation ===
  const handlePreviousSentence = useCallback(() => {
    if (currentChunkIndex !== null && currentChunkIndex > 0) {
      // Stop current playback if playing
      if (isSpeaking) {
        pausePlayback();
      }
      
      // Play the previous sentence
      const previousChunkIndex = currentChunkIndex - 1;
      console.log(`[${readerInstanceId}][Previous Sentence] Moving from chunk ${currentChunkIndex} to ${previousChunkIndex}`);
      
      // Prefetch and play the previous chunk
      prefetchChunks(previousChunkIndex);
      playChunk(previousChunkIndex);
    } else {
      console.log(`[${readerInstanceId}][Previous Sentence] Already at first sentence or no current chunk`);
    }
  }, [currentChunkIndex, isSpeaking, pausePlayback, prefetchChunks, playChunk, readerInstanceId]);

  const handleNextSentence = useCallback(() => {
    // Check if we're currently auto-advancing (from onended handler)
    // If so, don't pause - let auto-advance continue seamlessly
    if (isAutoAdvancingRef.current) {
      console.log(`[${readerInstanceId}][Next Sentence] Skipping pause - auto-advancing in progress`);
      return;
    }
    
    if (currentChunkIndex !== null && currentChunkIndex < chunks.length - 1) {
      // Stop current playback if playing (manual navigation only)
      if (isSpeaking) {
        pausePlayback();
      }
      
      // Play the next sentence
      const nextChunkIndex = currentChunkIndex + 1;
      console.log(`[${readerInstanceId}][Next Sentence] Manual navigation: Moving from chunk ${currentChunkIndex} to ${nextChunkIndex}`);
      
      // Prefetch and play the next chunk
      prefetchChunks(nextChunkIndex);
      playChunk(nextChunkIndex);
    } else {
      console.log(`[${readerInstanceId}][Next Sentence] Already at last sentence or no current chunk`);
    }
  }, [currentChunkIndex, chunks.length, isSpeaking, pausePlayback, prefetchChunks, playChunk, readerInstanceId]);

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

  // === Interactive Progress Bar Functions ===
  
  // Preview scroll without starting TTS
  const handlePreviewScroll = useCallback((percentage: number) => {
    if (!chunks || chunks.length === 0) return;
    
    // Convert percentage to chunk index
    const previewChunkIndex = Math.floor((percentage / 100) * chunks.length);
    const safeChunkIndex = Math.max(0, Math.min(previewChunkIndex, chunks.length - 1));
    
    console.log(`[${readerInstanceId}][handlePreviewScroll] Previewing ${Math.round(percentage)}% (chunk ${safeChunkIndex})`);
    
    // Try to find element with chunk text
    const chunkText = chunks[safeChunkIndex];
    if (!chunkText) return;
    
    // Search for element containing this chunk text
    const contentElement = document.querySelector('.epub-content');
    if (!contentElement) return;
    
    // Get all text nodes and find the one containing our chunk
    const walker = document.createTreeWalker(
      contentElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent?.includes(chunkText.substring(0, 30))) {
        // Found it! Scroll to parent element
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }
      }
    }
    
    // Fallback: estimate scroll position based on percentage
    if (contentElement) {
      const scrollHeight = contentElement.scrollHeight;
      const targetScroll = (percentage / 100) * scrollHeight;
      contentElement.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [chunks, readerInstanceId]);

  // Seek and start TTS (called on release)
  const handleSeekToPercentage = useCallback((percentage: number) => {
    console.log(`[${readerInstanceId}][handleSeekToPercentage] SEEK CALLED - percentage: ${percentage}`);
    
    if (!chunks || chunks.length === 0) {
      console.warn(`[${readerInstanceId}][handleSeekToPercentage] No chunks available`);
      return;
    }
    
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const targetChunkIndex = Math.floor((clampedPercentage / 100) * chunks.length);
    const safeChunkIndex = Math.max(0, Math.min(targetChunkIndex, chunks.length - 1));
    
    console.log(`[${readerInstanceId}][handleSeekToPercentage] Seeking to ${Math.round(clampedPercentage)}% (chunk ${safeChunkIndex})`);
    
    // Stop current playback first
    haltPlayback();
    
    // Reset all TTS state
    setIsSpeaking(false);
    setIsPaused(false);
    setIsProcessing(false);
    setHasFinishedPlayback(false);
    
    // Set the target chunk
    setCurrentChunkIndex(safeChunkIndex);
    setResumeIndex(null); // Clear resume so it starts fresh
    
    // Activate TTS intent and start playback
    ttsIntentActiveRef.current = true;
    
    // Start playback from target chunk
    setTimeout(() => {
      playChunk(safeChunkIndex);
    }, 150);
    
    addToast?.(`Starting from ${Math.round(clampedPercentage)}% of chapter`, 'success');
  }, [chunks, readerInstanceId, addToast, haltPlayback, playChunk]);

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