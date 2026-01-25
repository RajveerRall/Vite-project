import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnonymousUsageLimit } from './useAnonymousUsageLimit';
import { useTTSChunking } from './tts/useTTSChunking';
import { useTTS } from '../context/TTSContext';
import { useTTSHighlighting } from './tts/useTTSHighlighting';

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
  activeChunk: string | null;
  bufferedChunksCount: number;

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

  // Computed values
  canTTSResume: boolean;

  // Anonymous usage limit
  anonymousLimit: ReturnType<typeof useAnonymousUsageLimit>;
}

interface UseReaderTTSProps {
  bookTitle: string;
  bookAuthor?: string;
  bookId?: string;
  currentChapterHref?: string;
  chapterTitle?: string;
  currentPageDisplay: number;
  currentPageText: string;
  currentContent: string;
  selectedVoice?: string;
  ttsSpeed?: number;
  onPlaybackComplete?: () => void;
  isPageLoading?: boolean;
}

export const useReaderTTS = ({
  bookTitle,
  bookAuthor = 'Unknown Author',
  bookId,
  currentChapterHref,
  chapterTitle = 'Reading...',
  currentPageText,
  currentContent,
  // selectedVoice = 'en-US-BrianMultilingualNeural', // Unused in this shim
  ttsSpeed = 1,
  onPlaybackComplete,
  // isPageLoading = false // Unused in this shim
}: UseReaderTTSProps): UseReaderTTSReturn => {
  const anonymousLimit = useAnonymousUsageLimit();

  // effectiveBookId: Prefer bookId, fallback to bookTitle
  const effectiveBookId = bookId || bookTitle;

  // === Global Context ===
  const {
    isPlaying: globalIsPlaying,
    isPaused: globalIsPaused,
    isLoading: globalIsLoading,
    currentBookId: globalBookId,
    currentChunkIndex: globalChunkIndex,
    play: globalPlay,
    pause: globalPause,
    stop: globalStop,
    loadBook,
    setPlaybackRate: globalSetRate,
    seekToChunk: globalSeek
  } = useTTS();

  // === Local Processing ===
  const chunkingHook = useTTSChunking({ text: currentPageText });
  const chunks = chunkingHook.chunks;

  // === Derived State ===
  const isGlobalActive = globalBookId === effectiveBookId;
  const isSpeaking = isGlobalActive && globalIsPlaying;
  const isPaused = isGlobalActive && globalIsPaused;
  const isProcessing = isGlobalActive && globalIsLoading;
  const currentChunkIndex = isGlobalActive ? globalChunkIndex : null;

  const [useKokoroTTS] = useState(false);

  // === Highlighting ===
  // === Highlighting ===
  const { highlightedContent, activeChunk, highlightChunk, clearHighlight } = useTTSHighlighting(currentContent, { escapeHtml: false });

  // Update highlighting when chunk index changes
  useEffect(() => {
    if (isGlobalActive && currentChunkIndex !== null && chunks[currentChunkIndex]) {
      highlightChunk(currentContent, chunks[currentChunkIndex], currentChunkIndex);
    } else if (!isSpeaking && !isPaused) {
      clearHighlight();
    }
  }, [isGlobalActive, isSpeaking, isPaused, currentChunkIndex, chunks, currentContent, highlightChunk, clearHighlight]);

  // === Playback Completion Detection ===
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (isSpeaking) {
      wasPlayingRef.current = true;
    } else if (wasPlayingRef.current && !isPaused && !isSpeaking) {
      // Stopped. Check if we finished the chapter?
      if (chunks.length > 0 && currentChunkIndex !== null && currentChunkIndex >= chunks.length - 1) {
        console.log('[useReaderTTS] Playback finished for chapter, triggering completion');
        onPlaybackComplete?.();
        wasPlayingRef.current = false;
      }
    }
  }, [isSpeaking, isPaused, currentChunkIndex, chunks.length, onPlaybackComplete]);

  // Sync Global Playback Rate if prop changes
  useEffect(() => {
    if (isGlobalActive && ttsSpeed) {
      globalSetRate(ttsSpeed);
    }
  }, [isGlobalActive, ttsSpeed, globalSetRate]);

  // === Controls ===

  const handleTTS = useCallback(async () => {
    if (isSpeaking) {
      globalPause();
    } else if (isPaused) {
      globalPlay();
    } else {
      // Start fresh
      if (!effectiveBookId) {
        console.error("No book ID for TTS");
        return;
      }
      const targetHref = currentChapterHref || '';
      // When loading a new book/chapter, we start at chunk 0
      await loadBook(effectiveBookId, bookTitle, bookAuthor, chapterTitle, targetHref, 0);
      globalPlay();
    }
  }, [isSpeaking, isPaused, effectiveBookId, bookTitle, bookAuthor, chapterTitle, currentChapterHref, globalPause, globalPlay, loadBook]);

  const handleStopTTS = useCallback(() => {
    if (isGlobalActive) globalStop();
  }, [isGlobalActive, globalStop]);

  const pausePlayback = useCallback(() => {
    if (isGlobalActive) globalPause();
  }, [isGlobalActive, globalPause]);

  const resumePlayback = useCallback(() => {
    if (isGlobalActive && isPaused) globalPlay();
  }, [isGlobalActive, isPaused, globalPlay]);

  // === Navigation ===
  const handleTTSNavigation = useCallback(() => {
    // Stub
  }, []);

  const handlePreviousSentence = useCallback(() => {
    if (isGlobalActive && currentChunkIndex !== null && currentChunkIndex > 0) {
      globalSeek(currentChunkIndex - 1);
    }
  }, [isGlobalActive, currentChunkIndex, globalSeek]);

  const handleNextSentence = useCallback(() => {
    if (isGlobalActive && currentChunkIndex !== null) {
      globalSeek(currentChunkIndex + 1);
    }
  }, [isGlobalActive, currentChunkIndex, globalSeek]);

  const handlePreviewScroll = useCallback((_percentage: number) => {
    // Placeholder
  }, []);

  const handleSeekToPercentage = useCallback((percentage: number) => {
    if (chunks.length > 0) {
      const index = Math.floor((percentage / 100) * chunks.length);
      globalSeek(Math.min(index, chunks.length - 1));
    }
  }, [chunks.length, globalSeek]);

  const setPlaybackRate = useCallback((rate: number) => {
    globalSetRate(rate);
  }, [globalSetRate]);


  return {
    chunks,
    currentChunkIndex,
    isSpeaking,
    isProcessing,
    isPaused,
    resumeIndex: currentChunkIndex || 0,
    hasFinishedPlayback: !isSpeaking && !isPaused && wasPlayingRef.current === false && currentChunkIndex === chunks.length - 1,
    useKokoroTTS,
    highlightedContent,
    activeChunk,
    bufferedChunksCount: 0,

    handleTTS,
    handleStopTTS,
    pausePlayback,
    resumePlayback,

    handleTTSNavigation,
    handlePreviousSentence,
    handleNextSentence,

    handlePreviewScroll,
    handleSeekToPercentage,

    setPlaybackRate,

    canTTSResume: isPaused,
    anonymousLimit
  };
};