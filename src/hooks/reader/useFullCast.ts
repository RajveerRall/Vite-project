// src/hooks/reader/useFullCast.ts
// Custom hook for Full Cast audiobook functionality
// Implements Producer-Consumer pattern for audio streaming

import { useState, useEffect, useCallback, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';
import { requestFullCast, ttsForLine } from '../../services/fullCastTTS';
import { splitTextForFullCast, getPageTextContent } from '../../utils/readerUtils';
import {
  FULL_CAST_LOOKAHEAD,
  FULL_CAST_RETRY_DELAY,
  CONSUMER_RETRY_DELAY,
  FULL_CAST_STATUS,
} from '../../constants/readerConstants';

export type FullCastState = 'idle' | 'starting' | 'buffering' | 'playing' | 'paused' | 'stopped';

export interface UseFullCastReturn {
  // State
  isActive: boolean;
  status: string;
  buffered: number;
  needsTap: boolean;
  isPaused: boolean;
  hasStartedPlaying: boolean;
  
  // Commands
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

interface FullCastLine {
  dialogue: string;
  provider?: string;
  voiceId?: string;
}

interface AudioQueueItem {
  blob: Blob;
  line: FullCastLine;
}

/**
 * Custom hook for managing Full Cast audiobook playback
 * Handles streaming audio generation and playback using Producer-Consumer pattern
 */
export function useFullCast(
  currentPageText: string | undefined,
  currentContent: string | undefined,
  currentPageDisplay: number
): UseFullCastReturn {
  // State
  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [buffered, setBuffered] = useState<number>(0);
  const [needsTap, setNeedsTap] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);

  // Refs for internal state management
  const isPlayingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const chunksRef = useRef<string[]>([]);
  const startTsRef = useRef<number>(0);

  // Producer function: generates audio chunks and adds them to the queue
  const produce = useCallback(async () => {
    if (!isPlayingRef.current || isFetchingRef.current) return;
    if (audioQueueRef.current.length >= FULL_CAST_LOOKAHEAD) return;
    if (chunkIndexRef.current >= chunksRef.current.length) {
      // Track completion when all chunks are processed
      if (chunkIndexRef.current === chunksRef.current.length && audioQueueRef.current.length === 0) {
        trackEvent('full_cast_completed', {
          total_chunks: chunksRef.current.length,
          total_text_length: chunksRef.current.join('').length,
          page_number: currentPageDisplay,
        });
      }
      return;
    }

    const currentIdx = chunkIndexRef.current;
    isFetchingRef.current = true;
    setStatus(FULL_CAST_STATUS.CASTING(currentIdx + 1, chunksRef.current.length));
    const chunk = chunksRef.current[currentIdx];
    let producedAny = false;

    try {
      const { script } = await requestFullCast(chunk, {
        llm: 'gemini-2.0-flash',
        parser: 'chatThread',
        useVoiceCasting: true,
      });
      const lines = Array.isArray(script) ? script : [];

      // Fetch audio sequentially per line to reduce burst load
      for (const line of lines as any[]) {
        if (!isPlayingRef.current) break;
        const dialogue: string = line?.dialogue || line?.line || '';
        if (!dialogue) continue;
        const provider = line?.provider as string | undefined;
        const voiceId = line?.voiceId as string | undefined;

        try {
          const blob = await ttsForLine(dialogue, provider, voiceId);
          audioQueueRef.current.push({ blob, line: { dialogue, provider, voiceId } });
          setBuffered(audioQueueRef.current.length);
          producedAny = true;
        } catch (e) {
          console.error('[Full Cast] TTS failed for line', e);
          trackEvent('full_cast_tts_error', {
            error: e instanceof Error ? e.message : String(e),
            chunk_index: currentIdx,
            line_dialogue: dialogue.substring(0, 100),
          });
        }
      }
    } catch (e) {
      console.error('[Full Cast] casting failed for chunk', e);
      trackEvent('full_cast_casting_error', {
        error: e instanceof Error ? e.message : String(e),
        chunk_index: currentIdx,
        chunk_length: chunk.length,
      });
    } finally {
      isFetchingRef.current = false;
      
      // Advance chunk index only if we produced at least one audio item
      if (producedAny) {
        chunkIndexRef.current = currentIdx + 1;
      } else {
        // Retry the same chunk after a short backoff
        if (isPlayingRef.current) {
          setTimeout(() => {
            if (isPlayingRef.current) produce();
          }, FULL_CAST_RETRY_DELAY);
          return;
        }
      }
      
      // Keep producing until lookahead is satisfied or no chunks left
      if (isPlayingRef.current && audioQueueRef.current.length < FULL_CAST_LOOKAHEAD) {
        produce();
      }
    }
  }, [currentPageDisplay]);

  // Consumer function: plays audio from the queue
  const consume = useCallback(async () => {
    if (!isPlayingRef.current) return;
    
    if (audioQueueRef.current.length === 0) {
      // Try to produce more and retry soon
      produce();
      // Only show buffering status if we haven't started playing yet
      if (!hasStartedPlaying) {
        setStatus(FULL_CAST_STATUS.BUFFERING);
      }
      setTimeout(consume, CONSUMER_RETRY_DELAY);
      return;
    }

    const { blob } = audioQueueRef.current.shift()!;
    setBuffered(audioQueueRef.current.length);
    const url = URL.createObjectURL(blob);
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    audioRef.current.src = url;
    audioRef.current.onplay = () => {
      startTsRef.current = Date.now();
      setStatus(FULL_CAST_STATUS.PLAYING);
      setHasStartedPlaying(true);
    };
    
    audioRef.current.onended = () => {
      URL.revokeObjectURL(url);
      const elapsed = Math.max(0, Math.round((Date.now() - startTsRef.current) / 1000));
      try {
        window.dispatchEvent(
          new CustomEvent('tts-usage-updated', { detail: { seconds: elapsed } })
        );
      } catch {}
      // Top up buffer while playing next
      produce();
      consume();
    };
    
    audioRef.current.onerror = () => {
      URL.revokeObjectURL(url);
      consume();
    };
    
    try {
      await audioRef.current.play();
    } catch (e) {
      console.error('[Full Cast] play failed', e);
      setNeedsTap(true);
      setStatus(FULL_CAST_STATUS.TAP_TO_START);
    }
  }, [produce, hasStartedPlaying]);

  // Pause command
  const pause = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } catch {}
    isPlayingRef.current = false;
    setIsPaused(true);
    setStatus(FULL_CAST_STATUS.PAUSED);
  }, []);

  // Resume command
  const resume = useCallback(async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsPaused(false);
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        setStatus(FULL_CAST_STATUS.PLAYING);
      }
    } catch (e) {
      console.error('[Full Cast] resume play failed', e);
      setNeedsTap(true);
      setStatus(FULL_CAST_STATUS.TAP_TO_START);
    }
    produce();
    consume();
  }, [produce, consume]);

  // Stop command
  const stop = useCallback(() => {
    try {
      isPlayingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    } catch {}
    finally {
      setIsActive(false);
      setNeedsTap(false);
      setIsPaused(false);
      setHasStartedPlaying(false);
      audioQueueRef.current = [];
      chunksRef.current = [];
      chunkIndexRef.current = 0;
    }
  }, []);

  // Handle browser close warning when Full Cast is playing
  const hasUserInteractedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (isActive) {
      hasUserInteractedRef.current = true;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !hasStartedPlaying || !hasUserInteractedRef.current) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isActive && hasStartedPlaying) {
        console.log('Page hidden while audiobook is playing');
      }
    };

    const handlePageHide = () => {
      if (isActive && hasStartedPlaying) {
        console.log('Page hide event triggered while audiobook is playing');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isActive, hasStartedPlaying]);

  // Handle Full Cast requests from Controls
  useEffect(() => {
    const handler = async () => {
      const fullText = getPageTextContent(currentPageText, currentContent);
      if (!fullText) return;

      // Track Full Cast processing start
      trackEvent('full_cast_processing_start', {
        text_length: fullText.length,
        page_number: currentPageDisplay,
      });

      // Fire-and-forget: warm up Kokoro via microserver to reduce cold starts
      try {
        const { triggerKokoroWakeup } = await import('../../utils/kokoroWakeup');
        triggerKokoroWakeup();
      } catch {}

      // Split text into chunks
      chunksRef.current = splitTextForFullCast(fullText);

      // Reset state
      isPlayingRef.current = true;
      isFetchingRef.current = false;
      audioQueueRef.current = [];
      chunkIndexRef.current = 0;
      startTsRef.current = 0;

      // Initialize UI state
      setIsActive(true);
      setStatus(FULL_CAST_STATUS.STARTING);
      setBuffered(0);
      setNeedsTap(false);
      setIsPaused(false);
      setHasStartedPlaying(false);

      // Create new audio instance
      audioRef.current = new Audio();
      (window as any).__fullCastAudio = audioRef.current;

      // Expose controls globally (for Controls component)
      (window as any).__fullCastStop = stop;
      (window as any).__fullCastPause = pause;
      (window as any).__fullCastResume = resume;

      // Kick off producer/consumer
      produce();
      consume();
    };

    window.addEventListener('full-cast-request', handler as any);
    return () => {
      window.removeEventListener('full-cast-request', handler as any);
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioQueueRef.current.forEach(item => {
        if (item.blob) {
          URL.revokeObjectURL(URL.createObjectURL(item.blob));
        }
      });
    };
  }, [currentPageText, currentContent, currentPageDisplay, produce, consume, stop, pause, resume]);

  return {
    isActive,
    status,
    buffered,
    needsTap,
    isPaused,
    hasStartedPlaying,
    pause,
    resume,
    stop,
  };
}

