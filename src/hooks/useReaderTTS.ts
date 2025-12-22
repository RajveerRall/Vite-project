import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAnonymousUsageLimit } from './useAnonymousUsageLimit';
import { createTTSProgressRepository } from '../repositories/TTSProgressRepository';
import { createAdaptivePlaybackStrategy } from '../services/tts/strategies/AdaptivePlaybackStrategy';
import { IPlaybackStrategy } from '../services/tts/strategies/IPlaybackStrategy';
import { createTTSChunkService } from '../services/tts/TTSChunkService';
import { getUsageTracker, initializeUsageTracking } from '../services/tts/index';
import { highlightChunkInHtml, highlightTextInHtml } from '../utils/htmlHighlight';
import { fetchUsageLimit } from '../services/subscription/SubscriptionService';

// Helper: split text into sentence chunks
function splitTextIntoChunks(text: string): string[] {
  // Common abbreviations that should NOT trigger sentence splits
  // These are patterns that end with a period but aren't sentence endings
  const abbreviations = [
    // Titles
    'Dr\\.', 'Mr\\.', 'Mrs\\.', 'Ms\\.', 'Prof\\.', 'Rev\\.', 'Sr\\.', 'Jr\\.', 'Esq\\.',
    // Time
    'A\\.M\\.', 'P\\.M\\.', 'a\\.m\\.', 'p\\.m\\.',
    // Locations
    'U\\.S\\.', 'U\\.K\\.', 'E\\.U\\.', 'U\\.S\\.A\\.',
    // Latin
    'etc\\.', 'i\\.e\\.', 'e\\.g\\.', 'vs\\.', 'et al\\.',
    // Academic
    'Ph\\.D\\.', 'M\\.D\\.', 'B\\.A\\.', 'M\\.A\\.', 'B\\.S\\.', 'M\\.S\\.',
    // Common
    'Inc\\.', 'Ltd\\.', 'Corp\\.', 'Co\\.',
    // Additional common ones
    'St\\.', 'Ave\\.', 'Blvd\\.', 'Rd\\.', 'No\\.', 'Vol\\.', 'Ch\\.', 'pp\\.'
  ];
  
  // Create a regex pattern to match abbreviations (case-insensitive)
  const abbreviationPattern = new RegExp(
    `\\b(${abbreviations.join('|')})\\b`,
    'gi'
  );
  
  // Step 1: Normalize spacing after sentence-ending punctuation
  // Add space after punctuation when followed by a letter (fixes "warm.A" → "warm. A")
  // But skip if the punctuation is part of an abbreviation
  let normalizedText = text;
  
  // First, temporarily mark abbreviations to protect them
  const abbreviationMap = new Map<string, string>();
  let placeholderIndex = 0;
  
  normalizedText = normalizedText.replace(abbreviationPattern, (match) => {
    const placeholder = `__ABBR_${placeholderIndex}__`;
    abbreviationMap.set(placeholder, match);
    placeholderIndex++;
    return placeholder;
  });
  
  // Now normalize spacing after punctuation (only when followed by a letter)
  normalizedText = normalizedText.replace(/([.!?])([A-Za-z])/g, '$1 $2');
  
  // Restore abbreviations
  abbreviationMap.forEach((abbreviation, placeholder) => {
    normalizedText = normalizedText.replace(placeholder, abbreviation);
  });
  
  // Step 2: Split on sentence boundaries, avoiding abbreviations
  // Create a function to check if a potential split point is an abbreviation
  const isAbbreviationAtPosition = (text: string, position: number): boolean => {
    // Look back to find the word before the punctuation (up to 50 chars for longer contexts)
    const beforePunct = text.substring(Math.max(0, position - 50), position);
    const words = beforePunct.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const lastTwoWords = words.slice(-2).join(' ');
    
    // Check if last word + period matches an abbreviation
    const wordWithPeriod = lastWord + text[position];
    const isSingleWordAbbr = abbreviations.some(abbr => {
      const abbrClean = abbr.replace(/\\/g, ''); // Remove regex escaping
      const pattern = new RegExp(`^${abbrClean}$`, 'i');
      return pattern.test(wordWithPeriod);
    });
    
    // Check for multi-word abbreviations like "et al."
    const isMultiWordAbbr = /et\s+al\./i.test(lastTwoWords + text[position]);
    
    return isSingleWordAbbr || isMultiWordAbbr;
  };
  
  // Split manually, checking each potential split point
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    currentChunk += char;
    
    // Check if we hit a potential sentence boundary
    if (/[.!?]/.test(char)) {
      const nextChar = normalizedText[i + 1];
      const isEndOfText = i === normalizedText.length - 1;
      const isFollowedBySpace = nextChar === ' ' || nextChar === '\n' || nextChar === '\t';
      
      if ((isFollowedBySpace || isEndOfText) && !isAbbreviationAtPosition(normalizedText, i)) {
        // This is a real sentence boundary
        const trimmed = currentChunk.trim();
        if (trimmed.length > 0) {
          chunks.push(trimmed);
        }
        currentChunk = '';
        
        // Skip the space
        if (isFollowedBySpace) {
          i++; // Skip the space character
        }
      }
    }
  }
  
  // Add remaining text
  const trimmed = currentChunk.trim();
  if (trimmed.length > 0) {
    chunks.push(trimmed);
  }
  
  return chunks;
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
}

// Constants moved to src/constants/tts.ts
const PREFETCH_CHUNK_COUNT = 4;
const INITIAL_PREFETCH_COUNT = 2; // Fetch 2 chunks initially for faster startup
const MAX_AUDIO_BUFFER_SIZE = 10; // ✅ Limit total buffered chunks to prevent memory bloat

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
  const { refreshUsageLimit } = useSubscription();
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
  // ✅ Track last limit check time for periodic checks (60 seconds)
  const lastLimitCheckTimeRef = useRef<number>(0);
  const LIMIT_CHECK_INTERVAL_MS = 60000; // Check limit every 60 seconds
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
  // === Track if chunk is currently playing to prevent duplicates ===
  const isChunkPlayingRef = useRef<number | null>(null);
  // === Track chunks currently being prefetched to prevent duplicates ===
  const inFlightPrefetchRef = useRef<Set<number>>(new Set());
  // === Track buffered chunks count for UI ===
  const [bufferedChunksCount, setBufferedChunksCount] = useState<number>(0);

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
    setBufferedChunksCount(0);
    // Update the voice tracking ref
    bufferVoiceRef.current = selectedVoiceRef.current;
  }, [readerInstanceId]);

  // === Clean up old chunks when buffer exceeds limit ===
  const cleanupOldChunks = useCallback((currentIndex: number) => {
    const bufferKeys = Object.keys(audioBuffer.current).map(Number);
    if (bufferKeys.length <= MAX_AUDIO_BUFFER_SIZE) return;
    
    // Protect current chunk and nearby chunks (±2 range)
    const protectedChunks = new Set<number>();
    for (let i = -2; i <= 2; i++) {
      protectedChunks.add(currentIndex + i);
    }
    
    // Find chunks to evict (oldest, non-protected chunks)
    const chunksToEvict = bufferKeys
      .filter(key => !protectedChunks.has(key))
      .sort((a, b) => a - b) // Oldest first
      .slice(0, bufferKeys.length - MAX_AUDIO_BUFFER_SIZE);
    
    chunksToEvict.forEach(chunkIndex => {
      const url = audioBuffer.current[chunkIndex];
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      delete audioBuffer.current[chunkIndex];
      setBufferedChunksCount(prev => Math.max(0, prev - 1));
    });
    
    if (chunksToEvict.length > 0) {
      console.log(`[${readerInstanceId}][cleanupOldChunks] Evicted ${chunksToEvict.length} old chunks, buffer now has ${Object.keys(audioBuffer.current).length} chunks`);
    }
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

  // === Fetch single chunk helper (for optimistic initial playback) ===
  const fetchSingleChunk = useCallback(async (chunkIndex: number): Promise<void> => {
    if (chunks.length === 0 || chunkIndex < 0 || chunkIndex >= chunks.length) return;
    if (audioBuffer.current[chunkIndex] || currentChunkIndex === chunkIndex) return; // Already cached
    
    // Check if already in flight
    if (inFlightPrefetchRef.current.has(chunkIndex)) {
      console.log(`[FetchSingle] Chunk #${chunkIndex} already in flight, skipping`);
      return;
    }
    
    // Mark as in-flight
    inFlightPrefetchRef.current.add(chunkIndex);
    
    try {
      const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
      const textChunk = chunks[chunkIndex];
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
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      let response;
      try {
        response = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn(`[FetchSingle] TTS request timeout for chunk #${chunkIndex} after 30 seconds`);
          return;
        }
        throw fetchError;
      }
      
      if (!response.ok) return;
      
      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        console.warn(`[FetchSingle] Received empty audio blob for chunk #${chunkIndex}`);
        return;
      }
      
      const strategy = playbackStrategyRef.current;
      const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';
      
      if (isSeamless && strategy) {
        try {
          await strategy.prepareChunk(chunkIndex, audioBlob);
          console.log(`[FetchSingle] Pre-decoded chunk #${chunkIndex} for seamless playback`);
        } catch (err) {
          console.warn(`[FetchSingle] Failed to pre-decode chunk #${chunkIndex} for seamless playback`, err);
        }
      }
      
      try {
        const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
        const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
        durationsBuffer.current[chunkIndex] = seconds;
      } catch {}
      
      const audioUrl = URL.createObjectURL(audioBlob);
      audioBuffer.current[chunkIndex] = audioUrl;
      bufferVoiceRef.current = selectedVoiceRef.current;
      
      console.log(`[FetchSingle] Successfully buffered chunk #${chunkIndex}`);
      setBufferedChunksCount(prev => prev + 1);
      
      // ✅ Clean up old chunks if buffer is too large
      cleanupOldChunks(chunkIndex);
    } catch (error) {
      console.warn(`[FetchSingle] Failed to fetch chunk #${chunkIndex}`, error);
    } finally {
      inFlightPrefetchRef.current.delete(chunkIndex);
    }
  }, [chunks, currentChunkIndex, ttsSpeed, cleanupOldChunks]);

  // === Prefetch chunks function ===
  const prefetchChunks = useCallback(async (startIndex: number) => {
    if (chunks.length === 0) return;

    const normalizedStart = Math.max(0, startIndex);
    if (normalizedStart >= chunks.length) return;

    // ✅ FIX: Check if chunks in this range are already being prefetched
    const chunksToCheck: number[] = [];
    for (let i = 0; i < PREFETCH_CHUNK_COUNT && normalizedStart + i < chunks.length; i++) {
      chunksToCheck.push(normalizedStart + i);
    }
    
    // If all chunks are already in flight, skip this prefetch
    const allInFlight = chunksToCheck.every(idx => inFlightPrefetchRef.current.has(idx));
    if (allInFlight && chunksToCheck.length > 0) {
      console.log(`[Prefetch] Skipping duplicate prefetch for chunks ${normalizedStart}-${normalizedStart + chunksToCheck.length - 1} (already in flight)`);
      return;
    }

    const chunksToFetch = chunks.slice(normalizedStart, normalizedStart + PREFETCH_CHUNK_COUNT);
    if (chunksToFetch.length === 0) return;

    // ✅ FIX: Mark chunks as in-flight
    chunksToCheck.forEach(idx => inFlightPrefetchRef.current.add(idx));

    console.log(`[Prefetch] Starting pre-fetch for chunks from index ${normalizedStart}`);

    // Check if using seamless playback
    const strategy = playbackStrategyRef.current;
    const isSeamless = strategy && (strategy as any).getStrategyType?.() === 'seamless';

    for (let i = 0; i < chunksToFetch.length; i++) {
      const chunkIndex = normalizedStart + i;
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
        
        // Add timeout protection to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds
        
        let response;
        try {
          response = await fetch(`${apiUrl}?${params.toString()}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.warn(`[Prefetch] TTS request timeout for chunk #${chunkIndex} after 30 seconds`);
            continue; // Skip this chunk and continue with next
          }
          throw fetchError; // Re-throw other errors
        }
        
        if (!response.ok) continue;

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          console.warn(`[Prefetch] Received empty audio blob for chunk #${chunkIndex}. Skipping.`);
          continue;
        }

        // If using seamless playback, pre-decode into the Web Audio queue now
        if (isSeamless && strategy) {
          try {
            await strategy.prepareChunk(chunkIndex, audioBlob);
            console.log(`[Prefetch] Pre-decoded chunk #${chunkIndex} for seamless playback`);
          } catch (err) {
            console.warn(`[Prefetch] Failed to pre-decode chunk #${chunkIndex} for seamless playback`, err);
          }
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

        console.log(`[Prefetch] Successfully buffered chunk #${chunkIndex} with voice ${selectedVoiceRef.current}`);
        
        // ✅ FIX: Update buffered chunks count
        setBufferedChunksCount(prev => prev + 1);
        
        // ✅ Clean up old chunks if buffer is too large
        cleanupOldChunks(chunkIndex);

      } catch (error) {
        console.warn(`[Prefetch] Failed to pre-fetch chunk #${chunkIndex}`, error);
        addToast(`Failed to pre-fetch audio chunk ${chunkIndex + 1}. If it does not work contact us.`, 'error');
      } finally {
        // ✅ FIX: Remove from in-flight set when done (success or failure)
        inFlightPrefetchRef.current.delete(chunkIndex);
      }
    }
  }, [chunks, currentChunkIndex, ttsSpeed, addToast, cleanupOldChunks]);

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
          console.log(`[playChunk] Attempting seamless playback for chunk #${index}`);
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
        console.log(`[playChunk] Audio started playing chunk #${index}`);
        // Update currentChunkIndex when audio actually starts playing
        // This ensures highlight is synchronized with audio playback
        setCurrentChunkIndex(index);
      };
      
      const handleEnded = async () => {
        console.log(`[playChunk] Audio ended for chunk #${index}, advancing to chunk #${index + 1}`);
        
        // Calculate usage seconds
        const elapsed = playStartTimeRef.current[index] ? Math.round((Date.now() - playStartTimeRef.current[index]) / 1000) : 0;
        const seconds = (durationsBuffer.current[index] && durationsBuffer.current[index] > 0)
          ? durationsBuffer.current[index]
          : (elapsed > 0 ? elapsed : Math.round((audioRef.current as any)?.duration || 0));
        
        // ✅ DEBUG: Log seconds calculation for HTML5 playback
        console.log(`[playChunk] Usage calculation for chunk #${index}:`, {
          chunkIndex: index,
          durationsBufferValue: durationsBuffer.current[index],
          elapsed,
          audioDuration: (audioRef.current as any)?.duration,
          calculatedSeconds: seconds,
          playStartTime: playStartTimeRef.current[index],
          currentTime: Date.now()
        });
        
        // Use ref to ensure we always call the latest playChunk function
        // This fixes the stale closure issue when playChunk is recreated
        const nextChunkIndex = index + 1;
        
        // Check if there are more chunks to play
        if (nextChunkIndex < chunksRef.current.length) {
          // Set auto-advance flag to prevent handleNextSentence from pausing
          isAutoAdvancingRef.current = true;
          console.log(`[playChunk] Auto-advance flag set to true`);
          
          // ✅ CRITICAL FIX: Start next chunk IMMEDIATELY, don't wait for usage tracking
          // This eliminates the delay between chunks
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
          
          // ✅ FIX: Determine if we should check limit (periodic check every 60 seconds)
          const now = Date.now();
          const timeSinceLastCheck = now - lastLimitCheckTimeRef.current;
          const shouldCheckLimit = timeSinceLastCheck > LIMIT_CHECK_INTERVAL_MS;
          
          if (shouldCheckLimit) {
            console.log(`[playChunk] Performing periodic limit check (last check was ${Math.round(timeSinceLastCheck / 1000)}s ago)`);
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
          console.log(`[playChunk] Reached end of all chunks, playback complete`);
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
            } catch {}
            
            const audioUrl = URL.createObjectURL(audioBlob);
            audioBuffer.current[index] = audioUrl;
            bufferVoiceRef.current = selectedVoiceRef.current;
            
            // Retry playback with fresh audio
            console.log(`[playChunk] Retrying chunk #${index} with fresh audio after blob URL error`);
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
      
      // ✅ Prefetch next chunk only (reduced to prevent buffer bloat)
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
            // ✅ Prefetch next chunk only (reduced to prevent buffer bloat)
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
        // ✅ FIX: Update playing chunk ref when audio actually starts
        isChunkPlayingRef.current = chunkIndex;
        // Update currentChunkIndex when audio actually starts playing
        // This ensures highlight is synchronized with audio playback
        setCurrentChunkIndex(chunkIndex);
      },
      // onChunkComplete: async (chunkIndex: number) => {
      //   // Handle seamless auto-advance
      //   console.log(`[Strategy] Audio ended for chunk #${chunkIndex}, advancing to chunk #${chunkIndex + 1}`);
        
      //   // Calculate usage seconds
      //   const elapsed = playStartTimeRef.current[chunkIndex] ? Math.round((Date.now() - playStartTimeRef.current[chunkIndex]) / 1000) : 0;
      //   const seconds = (durationsBuffer.current[chunkIndex] && durationsBuffer.current[chunkIndex] > 0)
      //     ? durationsBuffer.current[chunkIndex]
      //     : (elapsed > 0 ? elapsed : 0);
        
      //   // ✅ DEBUG: Log seconds calculation for seamless playback
      //   console.log(`[Strategy] Usage calculation for chunk #${chunkIndex}:`, {
      //     chunkIndex,
      //     durationsBufferValue: durationsBuffer.current[chunkIndex],
      //     elapsed,
      //     calculatedSeconds: seconds,
      //     playStartTime: playStartTimeRef.current[chunkIndex],
      //     currentTime: Date.now()
      //   });
        
      //   // ✅ CRITICAL FIX: Make usage tracking blocking - stop playback if limit exceeded
      //   // ✅ FIX: Determine if we should check limit (periodic check every 60 seconds)
      //   const now = Date.now();
      //   const timeSinceLastCheck = now - lastLimitCheckTimeRef.current;
      //   const shouldCheckLimit = timeSinceLastCheck > LIMIT_CHECK_INTERVAL_MS;
        
      //   if (shouldCheckLimit) {
      //     console.log(`[Strategy] Performing periodic limit check (last check was ${Math.round(timeSinceLastCheck / 1000)}s ago)`);
      //     lastLimitCheckTimeRef.current = now;
      //   }
        
      //   try {
      //     await recordUsageSeconds(seconds, {
      //       skipLimitCheck: !shouldCheckLimit  // ✅ Only check limit periodically
      //     });
      //   } catch (error: any) {
      //     console.error(`[Strategy] Error recording usage seconds:`, error);
      //     // Stop playback if limit exceeded
      //     if (error?.code === 'TTS_USAGE_LIMIT_EXCEEDED' || 
      //         error?.message?.includes('limit exceeded') ||
      //         error?.message?.includes('TTS_USAGE_LIMIT_EXCEEDED')) {
      //       console.warn('[TTS Usage] Limit exceeded, stopping TTS playback');
      //       if (handleStopTTSRef.current) {
      //         handleStopTTSRef.current();
      //       }
      //       addToast('TTS usage limit reached. Please upgrade your subscription to continue.', 'error');
      //       window.dispatchEvent(new CustomEvent('tts-limit-exceeded', {
      //         detail: { error: error.message }
      //       }));
      //       return; // Don't continue to next chunk
      //     }
      //     // For other errors (network issues, etc.), log but continue playback
      //     console.warn('[TTS Usage] Non-critical error, continuing playback:', error);
      //   }
        
      //   // Auto-advance to next chunk
      //   const nextChunkIndex = chunkIndex + 1;
      //   if (nextChunkIndex < chunksRef.current.length && playChunkRef.current) {
      //     isAutoAdvancingRef.current = true;
      //     playChunkRef.current(nextChunkIndex).catch((error) => {
      //       console.error(`[Strategy] Error in auto-advance:`, error);
      //       isAutoAdvancingRef.current = false;
      //     });
      //     setTimeout(() => {
      //       isAutoAdvancingRef.current = false;
      //     }, 100);
      //   } else {
      //     // End of chunks
      //     setIsSpeaking(false);
      //     setIsPaused(false);
      //     setHasFinishedPlayback(true);
      //     setCurrentChunkIndex(null);
      //     clearResumeIndex();
          
      //     // Call the playback complete callback
      //     onPlaybackComplete?.();
      //   }
      // },

      // Vite-project/src/hooks/useReaderTTS.ts

      onChunkComplete: async (chunkIndex: number) => {
        // Handle seamless auto-advance
        console.log(`[Strategy] Audio ended for chunk #${chunkIndex}, advancing to chunk #${chunkIndex + 1}`);
        
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
    // ✅ Reset buffered chunks count when stopping
    setBufferedChunksCount(0);
  }, [haltPlayback, clearResumeIndex]);

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

    // ✅ FIX: Usage limit checks ONLY for NEW playback (not for pause/resume)
    // Check anonymous limit BEFORE starting TTS
    if (anonymousLimit) {
      const canUseTTS = await anonymousLimit.checkLimit();
      if (!canUseTTS) {
        console.warn('[TTS] Anonymous limit reached, blocking TTS');
        addToast('Please sign up to continue using Read Aloud', 'info');
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
              console.log(`[useReaderTTS] Extracting blob URLs from DOM: found ${images.length} images`);
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
              console.log(`[useReaderTTS] Extracted ${blobUrlMap.size} blob URLs from DOM`);
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
            console.log(`[useReaderTTS] Input HTML images (currentContent):`, {
              count: inputImgMatches.length,
              images: inputImageInfo
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
            console.log(`[useReaderTTS] Output HTML images (highlightedHtml):`, {
              count: outputImgMatches.length,
              images: outputImageInfo,
              imagesRemoved: inputImgMatches.length - outputImgMatches.length
            });
            
            setHighlightedContent(highlightedHtml);
            console.log(`[DEBUG] Updated highlightedContent for chunk ${currentChunkIndex}:`, {
              chunkIndex: currentChunkIndex,
              chunkLength: currentChunk.length,
              chunkPreview: currentChunk.substring(0, 50),
              highlightedContentLength: highlightedHtml.length,
              hasHighlightSpan: highlightedHtml.includes('<span class="tts-highlight">'),
              hasImages: highlightedHtml.includes('<img'),
              blobUrlsExtracted: blobUrlMap.size,
              inputImageCount: inputImgMatches.length,
              outputImageCount: outputImgMatches.length
            });
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
      // Play the previous sentence
      const previousChunkIndex = currentChunkIndex - 1;
      
      // ✅ FIX: Prevent playing same chunk if already playing
      if (isChunkPlayingRef.current === previousChunkIndex && isSpeaking) {
        console.log(`[${readerInstanceId}][Previous Sentence] Already playing chunk ${previousChunkIndex}, skipping`);
        return;
      }
      
      // Stop current playback if playing
      if (isSpeaking) {
        pausePlayback();
      }
      
      console.log(`[${readerInstanceId}][Previous Sentence] Moving from chunk ${currentChunkIndex} to ${previousChunkIndex}`);
      
      // ✅ FIX: Update playing chunk ref before playing
      isChunkPlayingRef.current = previousChunkIndex;
      
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
      // Play the next sentence
      const nextChunkIndex = currentChunkIndex + 1;
      
      // ✅ FIX: Prevent playing same chunk if already playing
      if (isChunkPlayingRef.current === nextChunkIndex && isSpeaking) {
        console.log(`[${readerInstanceId}][Next Sentence] Already playing chunk ${nextChunkIndex}, skipping`);
        return;
      }
      
      // Stop current playback if playing (manual navigation only)
      if (isSpeaking) {
        pausePlayback();
      }
      
      console.log(`[${readerInstanceId}][Next Sentence] Manual navigation: Moving from chunk ${currentChunkIndex} to ${nextChunkIndex}`);
      
      // ✅ FIX: Update playing chunk ref before playing
      isChunkPlayingRef.current = nextChunkIndex;
      
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

  // // Seek and start TTS (called on release)
  // const handleSeekToPercentage = useCallback((percentage: number) => {
  //   console.log(`[${readerInstanceId}][handleSeekToPercentage] SEEK CALLED - percentage: ${percentage}`);
    
  //   if (!chunks || chunks.length === 0) {
  //     console.warn(`[${readerInstanceId}][handleSeekToPercentage] No chunks available`);
  //     return;
  //   }
    
  //   const clampedPercentage = Math.max(0, Math.min(100, percentage));
  //   const targetChunkIndex = Math.floor((clampedPercentage / 100) * chunks.length);
  //   const safeChunkIndex = Math.max(0, Math.min(targetChunkIndex, chunks.length - 1));
    
  //   console.log(`[${readerInstanceId}][handleSeekToPercentage] Seeking to ${Math.round(clampedPercentage)}% (chunk ${safeChunkIndex})`);
    
  //   // Stop current playback first
  //   haltPlayback();
    
  //   // Reset all TTS state
  //   setIsSpeaking(false);
  //   setIsPaused(false);
  //   setIsProcessing(true); // Show loading state while prefetching
  //   setHasFinishedPlayback(false);
    
  //   // Don't set currentChunkIndex here - let onPlay callback set it when audio actually starts
  //   // This ensures highlight is synchronized with audio playback, not with the seek action
  //   setResumeIndex(null); // Clear resume so it starts fresh
    
  //   // Activate TTS intent
  //   ttsIntentActiveRef.current = true;
    
  //   // Prefetch target chunk (and next one) before playing to avoid delay
  //   const startPlayback = async () => {
  //     console.log(`[${readerInstanceId}][handleSeekToPercentage] Prefetching chunk ${safeChunkIndex} before playback`);
      
  //     try {
  //       // ✅ OPTIMISTIC PLAYBACK: Fetch first 2 chunks in parallel, then start playing immediately
  //       const firstChunkPromise = fetchSingleChunk(safeChunkIndex);
  //       const secondChunkPromise = safeChunkIndex + 1 < chunks.length 
  //         ? fetchSingleChunk(safeChunkIndex + 1) 
  //         : Promise.resolve();
        
  //       // Wait for first chunk to be ready, then start playing
  //       await firstChunkPromise;
  //       setIsProcessing(false);
  //       playChunk(safeChunkIndex);
        
  //       // Prefetch second chunk and remaining chunks in background (non-blocking)
  //       secondChunkPromise.catch(err => 
  //         console.warn('[handleSeekToPercentage] Background prefetch of second chunk failed:', err)
  //       );
  //       // ✅ Only prefetch next chunks (reduced to prevent buffer bloat)
  //       prefetchChunks(safeChunkIndex + INITIAL_PREFETCH_COUNT).catch(err => 
  //         console.warn('[handleSeekToPercentage] Background prefetch failed:', err)
  //       );
  //     } catch (error) {
  //       console.error(`[${readerInstanceId}][handleSeekToPercentage] Error starting playback:`, error);
  //       setIsProcessing(false);
  //       setIsSpeaking(false);
  //       setIsPaused(false);
  //       ttsIntentActiveRef.current = false;
  //       addToast?.('Failed to start playback. Please try again.', 'error');
  //     }
  //   };
  //   startPlayback();
    
  //   addToast?.(`Starting from ${Math.round(clampedPercentage)}% of chapter`, 'success');
  // }, [chunks, readerInstanceId, addToast, haltPlayback, playChunk, fetchSingleChunk, prefetchChunks]);


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
    setIsProcessing(true); // Show loading state while prefetching
    setHasFinishedPlayback(false);
    
    // Don't set currentChunkIndex here - let onPlay callback set it when audio actually starts
    // This ensures highlight is synchronized with audio playback, not with the seek action
    setResumeIndex(null); // Clear resume so it starts fresh
    
    // Activate TTS intent
    ttsIntentActiveRef.current = true;
    
    // Prefetch target chunk (and next one) before playing to avoid delay
    const startPlayback = async () => {
      console.log(`[${readerInstanceId}][handleSeekToPercentage] Prefetching chunk ${safeChunkIndex} before playback`);
      
      try {
        // ✅ OPTIMISTIC PLAYBACK: Start fetching the first chunk
        const firstChunkPromise = fetchSingleChunk(safeChunkIndex);
        
        // Start next chunk prefetch immediately (fire and forget)
        // We do this BEFORE awaiting the first chunk to maximize parallelism
        if (safeChunkIndex + 1 < chunks.length) {
             fetchSingleChunk(safeChunkIndex + 1).catch(err => 
                console.warn('[handleSeekToPercentage] Background prefetch of second chunk failed:', err)
             );
             // Trigger broader prefetch for subsequent chunks
             prefetchChunks(safeChunkIndex + INITIAL_PREFETCH_COUNT).catch(err => 
                console.warn('[handleSeekToPercentage] Background prefetch failed:', err)
             );
        }
        
        // Wait for first chunk to be ready (necessary for playback)
        await firstChunkPromise;
        
        setIsProcessing(false);
        
        // ✅ CHANGE: Wrap playChunk in setTimeout(0) to break synchronous execution
        // This ensures the UI updates (setIsProcessing: false) are painted before audio work begins
        setTimeout(() => {
            playChunk(safeChunkIndex);
        }, 0);
        
      } catch (error) {
        console.error(`[${readerInstanceId}][handleSeekToPercentage] Error starting playback:`, error);
        setIsProcessing(false);
        setIsSpeaking(false);
        setIsPaused(false);
        ttsIntentActiveRef.current = false;
        addToast?.('Failed to start playback. Please try again.', 'error');
      }
    };
    startPlayback();
    
    addToast?.(`Starting from ${Math.round(clampedPercentage)}% of chapter`, 'success');
  }, [chunks, readerInstanceId, addToast, haltPlayback, playChunk, fetchSingleChunk, prefetchChunks]);

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