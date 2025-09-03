import React, { useState, useEffect, useCallback, useRef } from 'react';

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
        const params = new URLSearchParams({
          text: textChunk,
          voice: selectedVoice,
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

        const audioUrl = URL.createObjectURL(audioBlob);
        audioBuffer.current[chunkIndex] = audioUrl;
        console.log(`[Prefetch] Successfully buffered chunk #${chunkIndex}`);

      } catch (error) {
        console.warn(`[Prefetch] Failed to pre-fetch chunk #${chunkIndex}`, error);
      }
    }
  }, [chunks, currentChunkIndex, selectedVoice, ttsSpeed]);

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
      audioRef.current.onended = () => {
        playChunk(index + 1);
      };
      audioRef.current.onerror = (e) => {
        console.error(`[${readerInstanceId}][playChunk] Audio playback error:`, e);
        setIsSpeaking(false); 
        setIsPaused(false); 
        setCurrentChunkIndex(null);
        ttsIntentActiveRef.current = false;
      };
      audioRef.current.play();
      prefetchChunks(index + 1);
    };

    if (audioBuffer.current[index]) {
      const bufferedUrl = audioBuffer.current[index];
      if (bufferedUrl && bufferedUrl.startsWith('blob:')) {
        console.log(`[playChunk] Playing chunk #${index} from BUFFER.`);
        playAudio(bufferedUrl);
      } else {
        console.log(`[playChunk] Buffered URL for chunk #${index} is invalid, fetching from NETWORK.`);
        delete audioBuffer.current[index];
      }
    }
    
    if (!audioBuffer.current[index]) {
      console.log(`[playChunk] Playing chunk #${index} from NETWORK.`);
      try {
        const textChunk = chunks[index];
        
        // Build query parameters with voice and speed
        const params = new URLSearchParams({
          text: textChunk,
          voice: selectedVoice,
          format: 'audio-24khz-48kbitrate-mono-mp3'
        });
        
        // Add speed parameter if not 1 (normal speed)
        if (ttsSpeed !== 1) {
          const speedPercent = Math.round((ttsSpeed - 1) * 100);
          const speedParam = speedPercent > 0 ? `+${speedPercent}%` : `${speedPercent}%`;
          // Fix: Use set() instead of append() to avoid double encoding
          params.set('rate', speedParam);
        }
        
        let response = await fetch(`/api/tts?${params.toString()}`);
        
        if (!response.ok) throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          throw new Error(`Received empty audio blob for chunk #${index}`);
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        audioBuffer.current[index] = audioUrl;
        playAudio(audioUrl);
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error(`[${readerInstanceId}][playChunk] Error fetching/playing audio:`, error);
          setIsSpeaking(false); 
          setIsPaused(false); 
          setCurrentChunkIndex(null);
          ttsIntentActiveRef.current = false;
        }
      }
    }
  }, [chunks, clearResumeIndex, prefetchChunks, readerInstanceId, selectedVoice, ttsSpeed]);

  // === Pause playback ===
  const pausePlayback = useCallback(() => {
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
      ttsIntentActiveRef.current = true;
    }
  }, [isSpeaking]);

  // === Resume playback ===
  const resumePlayback = useCallback(() => {
    if (audioRef.current && isPaused) {
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
          });
      } else {
        setIsPaused(false);
        setIsSpeaking(true);
        ttsIntentActiveRef.current = true;
      }
    } else if (!audioRef.current && currentChunkIndex !== null) {
      playChunk(currentChunkIndex);
    }
  }, [isPaused, currentChunkIndex, playChunk]);

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
  const handleTTS = useCallback(() => {
    console.log(`[${readerInstanceId}][handleTTS] TTS function called`, {
      isPaused,
      isSpeaking,
      hasCurrentPageText: !!currentPageText,
      chunksLength: chunks.length
    });
    
    ttsIntentActiveRef.current = true;

    if (isPaused) {
      console.log(`[${readerInstanceId}][handleTTS] Resuming paused playback`);
      resumePlayback();
      return;
    }
    if (isSpeaking) {
      console.log(`[${readerInstanceId}][handleTTS] Pausing current playback`);
      pausePlayback();
      return;
    }

    let startChunk = 0;

    // Check for user-highlighted text first
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    console.log(`[${readerInstanceId}][handleTTS] Selection check:`, {
      hasSelection: !!selection,
      selectedText: selectedText?.substring(0, 50),
      selectionLength: selectedText?.length,
      anchorNode: selection?.anchorNode,
      isInEpubContent: selection?.anchorNode?.parentElement?.closest('.epub-content') ? true : false
    });

    if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
      const startIndexInPage = currentPageText.indexOf(selectedText);

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
        } else {
          console.warn(`[${readerInstanceId}][handleTTS] Could not map selected text to a chunk. Starting from beginning.`);
        }
      } else {
        console.warn(`[${readerInstanceId}][handleTTS] Could not find selected text in page content. Starting from beginning.`);
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
    
    // Controls
    handleTTS,
    handleStopTTS,
    pausePlayback,
    resumePlayback,
    
    // Navigation
    handleTTSNavigation,
    handlePreviousSentence,
    handleNextSentence,
    
    // Computed
    canTTSResume,
  };
}; 