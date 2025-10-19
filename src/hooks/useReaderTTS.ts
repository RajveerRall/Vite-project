import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

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
}

const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';
const CHUNK_HIGHLIGHT_CLASS = 'tts-highlight';

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
  ttsSpeed = 1
}: UseReaderTTSProps): UseReaderTTSReturn => {
  const { addToast } = useToast();
  const { user } = useAuth();
  // === TTS Playback States ===
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false);
  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
  const [highlightedContent, setHighlightedContent] = useState<string>(currentContent);

  // === Refs ===
  const audioBuffer = useRef<Record<number, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerInstanceId = useRef(`ReaderInstance_${Date.now()}_${Math.random().toString(36).substring(2,7)}`).current;
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

  // === Usage recording helper ===
  const recordUsageSeconds = useCallback(async (seconds: number) => {
    if (!seconds || seconds <= 0) return;
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.rpc('increment_tts_usage', {
        p_user_id: user?.id ?? null,
        p_seconds: seconds,
        p_source: 'reader'
      });
      try {
        // Notify UI (e.g., header) to refresh usage indicator
        window.dispatchEvent(new CustomEvent('tts-usage-updated', { detail: { seconds, source: 'reader' } }));
      } catch {}
    } catch (e) {
      console.warn('[TTS Usage] Failed to record usage:', e);
    }
  }, [user?.id]);

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

  // === Local Storage Helpers ===
  const getStorageKey = useCallback((): string | null => {
    if (!bookTitle) return null;
    const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${LOCAL_STORAGE_PREFIX}${safeTitle}_page${currentPageDisplay}`;
  }, [bookTitle, currentPageDisplay]);

  const saveResumeIndex = useCallback((index: number) => {
    const key = getStorageKey();
    if (key && index >= 0) {
      try {
        localStorage.setItem(key, JSON.stringify({ index }));
        console.log(`%c[${readerInstanceId}][TTS Resume Save] Page ${currentPageDisplay}: Saved Index ${index} for key ${key}`, "color: blue;");
      } catch (e) {
        console.error(`%c[${readerInstanceId}][TTS Resume Save] Page ${currentPageDisplay}: Error saving:`, "color: red;", e);
      }
    }
  }, [currentPageDisplay, getStorageKey, readerInstanceId]);

  const loadResumeIndex = useCallback((): number | null => {
    const key = getStorageKey();
    if (!key) return null;
    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const data = JSON.parse(savedData);
        if (data && typeof data.index === 'number') {
          if (currentPageText && data.index >= currentPageText.length) {
            localStorage.removeItem(key);
            return null;
          }
          return data.index;
        }
      }
    } catch (e) {
      console.error(`%c[${readerInstanceId}][TTS Resume Load] Error loading for key ${key}:`, "color: red;", e);
      localStorage.removeItem(key);
    }
    return null;
  }, [currentPageText, getStorageKey, readerInstanceId]);

  const clearResumeIndex = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
        console.log(`%c[${readerInstanceId}][TTS Resume Clear] Page ${currentPageDisplay}: Cleared progress for key ${key}`, "color: purple;");
      } catch (e) {
        console.error(`%c[${readerInstanceId}][TTS Resume Clear] Page ${currentPageDisplay}: Error clearing for key ${key}:`, "color: red;", e);
      }
    }
    setResumeIndex(null);
    setHasFinishedPlayback(true);
    currentTTSBaseOffsetRef.current = 0;
  }, [currentPageDisplay, getStorageKey, readerInstanceId]);

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
      if (audioRef.current) {
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

    for (let i = 0; i < chunksToFetch.length; i++) {
      const chunkIndex = startIndex + i;
      if (audioBuffer.current[chunkIndex] || currentChunkIndex === chunkIndex) continue;

      try {
        const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
        const textChunk = chunksToFetch[i];
        // Use configured TTS API URL or default to relative path
        const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
        
        // Build query parameters with voice and speed
        // Build the absolute API base using env when provided (for other callers)

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
        
        let response = await fetch(`${apiUrl}?${params.toString()}`);
        
        if (!response.ok) continue;

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          console.warn(`[Prefetch] Received empty audio blob for chunk #${chunkIndex}. Skipping.`);
          continue;
        }

        // Track duration for this prefetched chunk (prefer server header, else decode)
        try {
          const headerSeconds = Number(response.headers.get('X-Audio-Duration') || 0);
          const seconds = headerSeconds > 0 ? headerSeconds : await getBlobDurationSeconds(audioBlob);
          durationsBuffer.current[chunkIndex] = seconds;
        } catch {}

        const audioUrl = URL.createObjectURL(audioBlob);
        audioBuffer.current[chunkIndex] = audioUrl;
        // Track the voice used for this buffered chunk
        bufferVoiceRef.current = selectedVoiceRef.current;
        console.log(`[Prefetch] Successfully buffered chunk #${chunkIndex} with voice ${selectedVoiceRef.current}`);

      } catch (error) {
        console.warn(`[Prefetch] Failed to pre-fetch chunk #${chunkIndex}`, error);
        addToast(`Failed to pre-fetch audio chunk ${chunkIndex + 1}. If it does not work contact us.`, 'error');
      }
    }
  }, [chunks, currentChunkIndex, ttsSpeed, addToast]);

  // === Play chunk function ===
  const playChunk = useCallback(async (index: number) => {
    if (index < 0 || index >= chunks.length) {
      setIsSpeaking(false); 
      setIsPaused(false); 
      setHasFinishedPlayback(true);
      setCurrentChunkIndex(null); 
      clearResumeIndex(); 
      ttsIntentActiveRef.current = false;
      return;
    }

    setCurrentChunkIndex(index);
    setIsSpeaking(true); 
    setIsPaused(false); 
    setHasFinishedPlayback(false);

    const playAudio = (audioUrl: string) => {
      if (audioRef.current) audioRef.current.pause();
      else audioRef.current = new Audio();

      audioRef.current.src = audioUrl;
      
      // Apply current playback speed to ensure it persists across chunks
      audioRef.current.playbackRate = ttsSpeedRef.current;
      console.log(`[playChunk] Applied playback rate: ${ttsSpeedRef.current}x to chunk #${index}`);
      
      audioRef.current.onplay = () => {
        playStartTimeRef.current[index] = Date.now();
      };
      audioRef.current.onended = async () => {
        const elapsed = playStartTimeRef.current[index] ? Math.round((Date.now() - playStartTimeRef.current[index]) / 1000) : 0;
        const seconds = (durationsBuffer.current[index] && durationsBuffer.current[index] > 0)
          ? durationsBuffer.current[index]
          : (elapsed > 0 ? elapsed : Math.round((audioRef.current as any)?.duration || 0));
        await recordUsageSeconds(seconds);
        playChunk(index + 1);
      };
      audioRef.current.onerror = (e) => {
        console.error(`[${readerInstanceId}][playChunk] Audio playback error:`, e);
        setIsSpeaking(false); 
        setIsPaused(false); 
        setCurrentChunkIndex(null);
        ttsIntentActiveRef.current = false;
        addToast('Audio playback failed. If it does not work contact us.', 'error');
      };
      audioRef.current.play();
      prefetchChunks(index + 1);
    };

    if (audioBuffer.current[index]) {
      const bufferedUrl = audioBuffer.current[index];
      if (bufferedUrl && bufferedUrl.startsWith('blob:') && bufferVoiceRef.current === selectedVoiceRef.current) {
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

  // === Pause playback ===
  const pausePlayback = useCallback(() => {
    console.log(`[${readerInstanceId}][pausePlayback] PAUSE CALLED - currentChunkIndex: ${currentChunkIndex}, isSpeaking: ${isSpeaking}`);
    
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
      ttsIntentActiveRef.current = true;
      
      // Save resume index
      if (currentChunkIndex !== null) {
        console.log(`[${readerInstanceId}][pausePlayback] Saving resumeIndex: ${currentChunkIndex}`);
        setResumeIndex(currentChunkIndex);
    }
    } else {
      console.log(`[${readerInstanceId}][pausePlayback] No audio ref or not speaking - audioRef: ${!!audioRef.current}, isSpeaking: ${isSpeaking}`);
    }
  }, [isSpeaking, currentChunkIndex, readerInstanceId]);

  // === Resume playback ===
  const resumePlayback = useCallback(() => {
    console.log(`[${readerInstanceId}][resumePlayback] RESUME CALLED - resumeIndex: ${resumeIndex}, isPaused: ${isPaused}, audioRef: ${!!audioRef.current}`);
    
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
    } else if (!audioRef.current && resumeIndex !== null) {
      console.log(`[${readerInstanceId}][resumePlayback] No audio ref, playing chunk ${resumeIndex}`);
      playChunk(resumeIndex);
    } else {
      console.log(`[${readerInstanceId}][resumePlayback] Cannot resume - resumeIndex: ${resumeIndex}, isPaused: ${isPaused}, audioRef: ${!!audioRef.current}`);
    }
  }, [isPaused, resumeIndex, playChunk, readerInstanceId, addToast]);

  // === Halt playback (for navigation or stopping) ===
  const haltPlayback = useCallback(() => {
    if (audioRef.current) {
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

  // === Handle main TTS button pressed ===
  const handleTTS = useCallback((selectedTextOverride?: string | any) => {
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

  }, [isPaused, isSpeaking, resumeIndex, chunks, currentPageText, readerInstanceId, pausePlayback, resumePlayback, playChunk, prefetchChunks]);

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

  // === Load resume index and highlight content ===
  useEffect(() => {
    const loadedIndex = loadResumeIndex();
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
    if (currentChunkIndex !== null && currentChunkIndex < chunks.length - 1) {
      // Stop current playback if playing
      if (isSpeaking) {
        pausePlayback();
      }
      
      // Play the next sentence
      const nextChunkIndex = currentChunkIndex + 1;
      console.log(`[${readerInstanceId}][Next Sentence] Moving from chunk ${currentChunkIndex} to ${nextChunkIndex}`);
      
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
  };
}; 