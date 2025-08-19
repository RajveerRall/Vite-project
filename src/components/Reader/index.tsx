import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBook } from '../../context/BookContext';
import { TTSService } from '../../services/msedge';
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
// import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import { TOCItem } from '../../types/books';
import './Reader.css';
import FeatureHighlight from './FeatureHighlight';
import { ChevronLeft, ChevronRight, Play, Headphones, Menu, X, Type, Plus, Minus, Settings } from 'lucide-react'; // Added Settings icon


const ttsService = TTSService.getInstance();
const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';

const CHUNK_HIGHLIGHT_CLASS = 'tts-highlight';

// Helper: split text into sentence chunks
function splitTextIntoChunks(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(chunk => chunk.trim().length > 0);
}

const Reader: React.FC = () => {
  const {
    bookTitle,
    bookAuthor,
    currentPageDisplay,
    totalPages,
    currentContent,
    toc,
    closeBook,
    nextPage,
    prevPage,
    navigateToTocItem,
    isPlayModeVisible,
    togglePlayMode,
    currentPageText,
    isLoading
  } = useBook();

  // === TTS Playback States ===
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false);
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(true);
  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
  const [highlightedContent, setHighlightedContent] = useState<string>(currentContent);
  // Mobile TOC drawer state
  const [isTocDrawerOpen, setIsTocDrawerOpen] = useState<boolean>(false);
  // Font size state - persisted in localStorage
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem('reader-font-size');
    return savedFontSize ? parseInt(savedFontSize, 10) : 16; // Default 16px
  });
  
  // Theme state - persisted in localStorage
  type Theme = 'light' | 'dark' | 'sepia';
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('reader-theme') as Theme;
    return savedTheme || 'light'; // Default to light theme
  });
  
  // Settings widget state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  // Add this near your other useState declarations
  const audioBuffer = useRef<Record<number, string>>({});
    // Determine if the pagination buttons should be disabled
  const canGoPrev = currentPageDisplay > 0;
  const canGoNext = currentPageDisplay < totalPages - 1;


  // Refs
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
      setChunks(splitTextIntoChunks(currentPageText));
      setCurrentChunkIndex(null);
      setIsSpeaking(false);
      setIsPaused(false);
      setIsProcessing(false);
      setHasFinishedPlayback(false);
      // setResumeIndex(null);
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

  // In Reader.tsx
  const prefetchChunks = useCallback(async (startIndex: number) => {
    const chunksToFetch = chunks.slice(startIndex, startIndex + 2);
    if (chunksToFetch.length === 0) return;

    console.log(`[Prefetch] Starting pre-fetch for chunks from index ${startIndex}`);

    for (let i = 0; i < chunksToFetch.length; i++) {
      const chunkIndex = startIndex + i;
      // Use .current to access the ref's value
      if (audioBuffer.current[chunkIndex] || currentChunkIndex === chunkIndex) continue;

      try {

        const ttsApiUrl = import.meta.env.VITE_TTS_API_URL || '';
        const textChunk = chunksToFetch[i];
        // Use configured TTS API URL or default to local
        const apiUrl = ttsApiUrl ? `${ttsApiUrl}/api/tts` : '/api/tts';
        let response = await fetch(`${apiUrl}?text=${encodeURIComponent(textChunk)}&voice=en-US-BrianMultilingualNeural&format=audio-24khz-48kbitrate-mono-mp3`);
        
        if (!response.ok) continue;


        const audioBlob = await response.blob();
        // --- FIX: VALIDATE THE BLOB BEFORE USING IT ---
        if (audioBlob.size === 0) {
          console.warn(`[Prefetch] Received empty audio blob for chunk #${chunkIndex}. Skipping.`);
          continue; // Do not buffer an empty or invalid audio file
        }
        // --- END FIX ---



        const audioUrl = URL.createObjectURL(audioBlob);

        // Directly modify the .current property of the ref
        audioBuffer.current[chunkIndex] = audioUrl;
        console.log(`[Prefetch] Successfully buffered chunk #${chunkIndex}`);

      } catch (error) {
        console.warn(`[Prefetch] Failed to pre-fetch chunk #${chunkIndex}`, error);
      }
    }
  }, [chunks, currentChunkIndex]); // No longer depends on audioBuffer






  const playChunk = useCallback(async (index: number) => {
    if (index < 0 || index >= chunks.length) {
      // ... (end-of-playback logic is the same)
      setIsSpeaking(false); setIsPaused(false); setHasFinishedPlayback(true);
      setCurrentChunkIndex(null); clearResumeIndex(); ttsIntentActiveRef.current = false;
      return;
    }

    setCurrentChunkIndex(index);
    setIsSpeaking(true); setIsPaused(false); setHasFinishedPlayback(false);

    const playAudio = (audioUrl: string) => {
      if (audioRef.current) audioRef.current.pause();
      else audioRef.current = new Audio();

      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => {
        // Don't revoke here, do it in a cleanup effect
        playChunk(index + 1);
      };
      audioRef.current.onerror = (e) => { /* ... error handling is the same ... */
          console.error(`[${readerInstanceId}][playChunk] Audio playback error:`, e);
          setIsSpeaking(false); setIsPaused(false); setCurrentChunkIndex(null);
          ttsIntentActiveRef.current = false;
      };
      audioRef.current.play();
      prefetchChunks(index + 1);
    };

    // *** THE CRITICAL FIX: Check the .current property of the ref ***
    if (audioBuffer.current[index]) {
      const bufferedUrl = audioBuffer.current[index];
      // Validate that the blob URL is still valid
      if (bufferedUrl && bufferedUrl.startsWith('blob:')) {
        console.log(`[playChunk] Playing chunk #${index} from BUFFER.`);
        playAudio(bufferedUrl);
      } else {
        console.log(`[playChunk] Buffered URL for chunk #${index} is invalid, fetching from NETWORK.`);
        // Remove invalid entry from buffer
        delete audioBuffer.current[index];
        // Fall through to network fetch
      }
    }
    
    // Fetch from network if no valid buffer entry
    if (!audioBuffer.current[index]) {
      console.log(`[playChunk] Playing chunk #${index} from NETWORK.`);
      try {
        const textChunk = chunks[index];
        let response = await fetch(`/api/tts?text=${encodeURIComponent(textChunk)}&voice=en-US-BrianMultilingualNeural&format=audio-24khz-48kbitrate-mono-mp3`);
        
        if (!response.ok) throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);



        const audioBlob = await response.blob();
        // --- FIX: VALIDATE THE BLOB BEFORE USING IT --- 
        if (audioBlob.size === 0) {
          throw new Error(`Received empty audio blob for chunk #${index}`);
        }
        // --- END FIX ---



        const audioUrl = URL.createObjectURL(audioBlob);
        // Also store the newly fetched URL in the buffer for safety
        audioBuffer.current[index] = audioUrl;
        playAudio(audioUrl);
      } catch (error) {
          if ((error as any).name !== 'AbortError') {
              console.error(`[${readerInstanceId}][playChunk] Error fetching/playing audio:`, error);
              setIsSpeaking(false); setIsPaused(false); setCurrentChunkIndex(null);
              ttsIntentActiveRef.current = false;
          }
      }
    }
  }, [chunks, clearResumeIndex, prefetchChunks, readerInstanceId]); // No longer depends on audioBuffer


  // === Pause playback ===
const pausePlayback = useCallback(() => {
  if (audioRef.current && isSpeaking) {
    audioRef.current.pause();
    setIsPaused(true);
    setIsSpeaking(false);
    ttsIntentActiveRef.current = true; // Keep intent active when paused
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
      // If play() does not return a promise, update states immediately
      setIsPaused(false);
      setIsSpeaking(true);
      ttsIntentActiveRef.current = true;
    }
  } else if (!audioRef.current && currentChunkIndex !== null) {
    playChunk(currentChunkIndex);
  }
}, [isPaused, currentChunkIndex, playChunk]);

// === Stop playback ===
// const stopPlayback = useCallback(() => {
//   if (audioRef.current) {
//     audioRef.current.pause();
//     URL.revokeObjectURL(audioRef.current.src);
//     audioRef.current.src = '';
//     audioRef.current = null;
//   }
//   if (abortControllerRef.current) {
//     abortControllerRef.current.abort();
//   }
//   setIsSpeaking(false);
//   setIsPaused(false);
//   setCurrentChunkIndex(null);
//   setHasFinishedPlayback(true);
//   clearResumeIndex();
//   ttsIntentActiveRef.current = false;
// }, [clearResumeIndex]);


// === Halt playback (for navigation or stopping) ===
// This function ONLY stops the audio; it does not clear resume progress.
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
  
  // Clear all buffered audio URLs to prevent playing invalid blob URLs
  const bufferUrls = Object.values(audioBuffer.current);
  console.log(`[${readerInstanceId}][haltPlayback] Clearing ${bufferUrls.length} buffered audio URLs`);
  bufferUrls.forEach(url => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
  audioBuffer.current = {}; // Clear the buffer
  
  setIsSpeaking(false);
  setIsPaused(false);
  setCurrentChunkIndex(null);
  // NOTE: clearResumeIndex() is intentionally removed.
}, []);


// === Handle user clicking the STOP button ===
// This stops playback AND clears the resume progress for the page.
const handleStopTTS = useCallback(() => {
  haltPlayback();
  clearResumeIndex();
  ttsIntentActiveRef.current = false;
}, [haltPlayback, clearResumeIndex]);



// === Handle main TTS button pressed ===
// const handleTTS = useCallback(() => {
//   ttsIntentActiveRef.current = true;
//   if (isPaused) {
//     resumePlayback();
//   } else if (isSpeaking) {
//     pausePlayback();
//   } else {
//     // Start playback from resumeIndex chunk if possible
//     let startChunk = 0;
//     if (resumeIndex !== null && resumeIndex >= 0) {
//       let accumulatedLength = 0;
//       for (let i = 0; i < chunks.length; i++) {
//         accumulatedLength += chunks[i].length + 1; // +1 for space/newline
//         if (resumeIndex < accumulatedLength) {
//           startChunk = i;
//           break;
//         }
//       }
//     }
//     playChunk(startChunk);
//   }
// }, [isPaused, isSpeaking, resumeIndex, chunks, pausePlayback, resumePlayback, playChunk]);


// In your UPDATED Reader.tsx file, replace the existing handleTTS function with this one.

  const handleTTS = useCallback(() => {
    ttsIntentActiveRef.current = true;

    if (isPaused) {
      resumePlayback();
      return;
    }
    if (isSpeaking) {
      pausePlayback();
      return;
    }

    // --- START: NEW AND RESTORED LOGIC ---
    let startChunk = 0;

    // 1. Check for user-highlighted text first. This takes highest priority.
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
      const startIndexInPage = currentPageText.indexOf(selectedText);

      if (startIndexInPage !== -1) {
        console.log(`[${readerInstanceId}][handleTTS] User selected text. Index: ${startIndexInPage}.`);
        // Find which chunk the selected text starts in
        let accumulatedLength = 0;
        let foundChunk = false;
        for (let i = 0; i < chunks.length; i++) {
          if (startIndexInPage < accumulatedLength + chunks[i].length) {
            startChunk = i;
            foundChunk = true;
            break;
          }
          accumulatedLength += chunks[i].length + 1; // +1 for the space separator
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
    // 2. If no text is selected, try to use the resumeIndex from localStorage.
    else if (resumeIndex !== null && resumeIndex >= 0) {
      let accumulatedLength = 0;
      for (let i = 0; i < chunks.length; i++) {
        accumulatedLength += chunks[i].length + 1; // +1 for space/newline
        if (resumeIndex < accumulatedLength) {
          startChunk = i;
          break;
        }
      }
      console.log(`[${readerInstanceId}][handleTTS] Resuming from saved index ${resumeIndex}, which corresponds to chunk #${startChunk}.`);
    }
    // 3. If neither of the above, start from the beginning (startChunk is already 0).
    else {
      console.log(`[${readerInstanceId}][handleTTS] No selection or resume index. Starting from beginning.`);
    }
    // --- END: NEW AND RESTORED LOGIC ---

    // playChunk(startChunk);


    const startPlayback = async () => {
      setIsProcessing(true); 
      await prefetchChunks(startChunk);
      setIsProcessing(false);
      playChunk(startChunk);
    };
    startPlayback();

  }, [isPaused, isSpeaking, resumeIndex, chunks, currentPageText, readerInstanceId, pausePlayback, resumePlayback, playChunk]);

  // === Save progress periodically on chunk change ===
  useEffect(() => {
    if (currentChunkIndex !== null && chunks.length > 0) {
      // Calculate char offset of chunk start
      let offset = 0;
      for (let i = 0; i < currentChunkIndex; i++) {
        offset += chunks[i].length + 1;
      }
      currentTTSBaseOffsetRef.current = offset;
      saveResumeIndex(offset);
      setHasFinishedPlayback(false);
    }
  }, [currentChunkIndex, chunks, saveResumeIndex]);

  // // === Load resume index on page load ===
  // useEffect(() => {
  //   const loadedIndex = loadResumeIndex();
  //   setResumeIndex(loadedIndex);
  //   setHasFinishedPlayback(false);
    
  // }, [loadResumeIndex, currentPageDisplay]);


  useEffect(() => {
  const loadedIndex = loadResumeIndex();
  setResumeIndex(loadedIndex);
  setHasFinishedPlayback(false);

  if (!currentPageText || loadedIndex === null) {
    setHighlightedContent(currentContent); // no highlight, just normal content
    return;
  }

  const highlightLength = 30; // number of characters to highlight
  const start = loadedIndex;
  const end = Math.min(start + highlightLength, currentPageText.length);

  // Simple HTML escape function to avoid breaking markup
  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const before = escapeHtml(currentPageText.substring(0, start));
  const highlight = escapeHtml(currentPageText.substring(start, end));
  const after = escapeHtml(currentPageText.substring(end));

  const highlightedHtml = `${before}<span class="highlight">${highlight}</span>${after}`;
  setHighlightedContent(highlightedHtml);

}, [loadResumeIndex, currentPageDisplay, currentContent, currentPageText]);


  // === Handle stopping playback on page navigation or close ===
  // const commonTTSStopAndSaveLogic = useCallback(() => {
  //   if (ttsIntentActiveRef.current && (isSpeaking || isPaused)) {
  //     saveResumeIndex(currentTTSBaseOffsetRef.current);
  //     stopPlayback();
  //   } else {
  //     stopPlayback();
  //   }
  //   ttsIntentActiveRef.current = false;
  // }, [isSpeaking, isPaused, saveResumeIndex, stopPlayback]);


  // === Handle stopping playback on page navigation or close ===
const commonTTSStopAndSaveLogic = useCallback(() => {
  // If the user was actively listening or paused...
  if (ttsIntentActiveRef.current && (isSpeaking || isPaused)) {
    // ...save their current spot.
    saveResumeIndex(currentTTSBaseOffsetRef.current);
  }
  // ALWAYS halt the audio playback without deleting the saved spot.
  haltPlayback();
  ttsIntentActiveRef.current = false;
}, [isSpeaking, isPaused, saveResumeIndex, haltPlayback]);

  // Mobile TOC drawer functions
  const toggleTocDrawer = useCallback(() => {
    setIsTocDrawerOpen(prev => !prev);
  }, []);

  const closeTocDrawer = useCallback(() => {
    setIsTocDrawerOpen(false);
  }, []);

  // Font size adjustment functions
  const increaseFontSize = useCallback(() => {
    setFontSize(prev => {
      const newSize = Math.min(prev + 2, 24); // Max 24px
      localStorage.setItem('reader-font-size', newSize.toString());
      return newSize;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => {
      const newSize = Math.max(prev - 2, 12); // Min 12px
      localStorage.setItem('reader-font-size', newSize.toString());
      return newSize;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    const defaultSize = 16;
    setFontSize(defaultSize);
    localStorage.setItem('reader-font-size', defaultSize.toString());
  }, []);

  // Theme management functions
  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('reader-theme', newTheme);
  }, []);

  // Settings widget control functions
  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Keyboard shortcuts for font size adjustment
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close settings with ESC key
      if (event.key === 'Escape' && isSettingsOpen) {
        event.preventDefault();
        closeSettings();
        return;
      }

      // Only trigger font shortcuts if not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + Plus/Equal for increase font size
      if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        increaseFontSize();
      }
      // Ctrl/Cmd + Minus for decrease font size
      else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        decreaseFontSize();
      }
      // Ctrl/Cmd + 0 for reset font size
      else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        resetFontSize();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [increaseFontSize, decreaseFontSize, resetFontSize, isSettingsOpen, closeSettings]);

  // Navigation handlers wrapped to stop TTS
  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    commonTTSStopAndSaveLogic();
    navigateToTocItem(item);
    closeTocDrawer(); // Close mobile drawer after navigation
  }, [commonTTSStopAndSaveLogic, navigateToTocItem, closeTocDrawer]);

  const handlePrevPage = useCallback(() => {
    commonTTSStopAndSaveLogic();
    prevPage();
  }, [commonTTSStopAndSaveLogic, prevPage]);

  const handleNextPage = useCallback(() => {
    commonTTSStopAndSaveLogic();
    nextPage();
  }, [commonTTSStopAndSaveLogic, nextPage]);

  const handleCloseBookCB = useCallback(() => {
    commonTTSStopAndSaveLogic();
    closeBook();
  }, [commonTTSStopAndSaveLogic, closeBook]);

  const canTTSResume = !!currentPageText && resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback;

  // === Render text with current chunk highlighted ===
  const renderContentWithHighlight = () => {
    if (!chunks.length) return null;
    return chunks.map((chunk, idx) => (
      <span
        key={idx}
        className={idx === currentChunkIndex ? CHUNK_HIGHLIGHT_CLASS : ''}
        style={{ transition: 'background-color 0.3s ease' }}
      >
        {chunk + ' '}
      </span>
    ));
  };

  // return (
  //   <div className="reader">
  //     <header className="reader-header">
  //       <div className="reader-left">
  //         <button onClick={handleCloseBookCB} className="back-button"> ← Back to Library </button>
  //       </div>
  //       <div className="reader-center">
  //         <h2 className="book-title">{bookTitle}</h2>
  //         <p className="book-author">{bookAuthor}</p>
  //       </div>
  //       <div className="reader-right">
  //         <div className="controls-container">
  //           <Controls
  //             currentPage={currentPageDisplay}
  //             totalPages={totalPages}
  //             onPrevious={handlePrevPage}
  //             onNext={handleNextPage}
  //             onReadAloud={handleTTS}
  //             onStopTTS={stopPlayback}
  //             isReading={isSpeaking}
  //             isPaused={isPaused}
  //             isProcessing={isProcessing && !(isSpeaking || isPaused)}
  //             canResume={canTTSResume}
  //             onAudiobook={togglePlayMode}
  //             isPlayModeActive={isPlayModeVisible}
  //             isReadButtonActive={isSpeaking || isPaused || canTTSResume}
  //           />
  //         </div>
  //       </div>
  //     </header>

  //     <div className="reader-container">
  //       {((isLoading && !currentContent && !isPlayModeVisible) || (isProcessing && !isSpeaking && !isPaused && !isPlayModeVisible)) ? (
  //         <div className="loading-overlay">
  //           <div className="loading-spinner"></div>
  //           <p>
  //             {isLoading && !currentContent && !isProcessing ? 'Loading book content...' : ''}
  //             {isProcessing && !isSpeaking && !isPaused ? 'Preparing audio...' : ''}
  //           </p>
  //         </div>
  //       ) : null}
  //       <div className="reader-sidebar">
  //         <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
  //       </div>
  //       <div className="reader-main">
  //         <SearchBar />
  //         <div className="epub-content" style={{ whiteSpace: 'pre-wrap' }}>
  //           {renderContentWithHighlight()}
  //         </div>
  //       </div>
  //       {isPlayModeVisible && (
  //         useKokoroTTS ? (
  //           <KokoroPlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
  //         ) : (
  //           <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
  //         )
  //       )}
  //     </div>
  //     {showFeatureHighlight && (<FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />)}

  //     <style>{`
  //       .${CHUNK_HIGHLIGHT_CLASS} {
  //         background-color: #fffb91;
  //         border-radius: 3px;
  //       }
  //     `}</style>
  //   </div>
  // );


  return (
  <div className={`reader theme-${theme}`}>
    <header className="reader-header">
      <div className="reader-left">
        {/* <button onClick={handleCloseBookCB} className="back-button"> ← Back to Library </button> */}
          <button 
          onClick={handleCloseBookCB} 
          className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
        >
          <ChevronLeft className="w-4 h-4" /> 
          Back to Library
        </button>
            </div>
      <div className="reader-center">
        <h2 className="book-title">{bookTitle}</h2>
        <p className="book-author">{bookAuthor}</p>
      </div>
      <div className="reader-right">
        {/* Settings Button */}
        <button 
          onClick={toggleSettings}
          className="settings-button p-2 text-gray-600 hover:text-amber-800 transition-colors mr-2"
          aria-label="Open reading settings"
          title="Reading settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Mobile TOC Button */}
        <button 
          onClick={toggleTocDrawer}
          className="mobile-toc-button md:hidden p-2 text-gray-600 hover:text-amber-800 transition-colors mr-2"
          aria-label="Toggle Table of Contents"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="controls-container">
          <Controls
            currentPage={currentPageDisplay}
            totalPages={totalPages}
            onPrevious={handlePrevPage}
            onNext={handleNextPage}
            onReadAloud={handleTTS}
            onStopTTS={handleStopTTS}
            isReading={isSpeaking}
            isPaused={isPaused}
            isProcessing={isProcessing && !(isSpeaking || isPaused)}
            canResume={canTTSResume}
            onAudiobook={togglePlayMode}
            isPlayModeActive={isPlayModeVisible}
            isReadButtonActive={isSpeaking || isPaused || canTTSResume}
          />
        </div>
      </div>
    </header>

    <div className="reader-container">
      {((isLoading && !currentContent && !isPlayModeVisible) || (isProcessing && !isSpeaking && !isPaused && !isPlayModeVisible)) ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>
            {isLoading && !currentContent && !isProcessing ? 'Loading book content...' : ''}
            {isProcessing && !isSpeaking && !isPaused ? 'Preparing audio...' : ''}
          </p>
        </div>
      ) : null}
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="reader-sidebar hidden md:block">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>
      
      {/* Mobile TOC Drawer */}
      {isTocDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="toc-drawer-backdrop md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeTocDrawer}
          />
          
          {/* Drawer */}
          <div className="toc-drawer md:hidden fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">Table of Contents</h3>
              <button 
                onClick={closeTocDrawer}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close Table of Contents"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
            </div>
          </div>
        </>
      )}
      <div className="reader-main">
        {/* <SearchBar /> */}
        {/* Render React nodes here, no dangerouslySetInnerHTML */}
        <div 
          className="epub-content" 
          style={{ 
            whiteSpace: 'pre-wrap',
            fontSize: `${fontSize}px`,
            lineHeight: '1.6'
          }}
        >
          {renderContentWithHighlight()}
        </div>
      </div>
      {isPlayModeVisible && (
        useKokoroTTS ? (
          <KokoroPlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        ) : (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        )
      )}
    </div>
    {showFeatureHighlight && (<FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />)}

    {/* Floating Settings Widget */}
    {isSettingsOpen && (
      <>
        {/* Backdrop */}
        <div 
          className="settings-backdrop fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={closeSettings}
        />
        
        {/* Settings Panel */}
        <div className="settings-widget fixed bottom-6 right-6 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4 min-w-[280px] max-w-[90vw]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Reading Settings
            </h3>
            <button 
              onClick={closeSettings}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Font Size Controls */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Font Size</label>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={decreaseFontSize}
                  className="p-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-white"
                  aria-label="Decrease font size"
                  title="Decrease font size (Ctrl/Cmd + -)"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <button 
                  onClick={resetFontSize}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-amber-800 transition-colors font-medium bg-white rounded-lg border border-gray-200 hover:border-amber-300 min-w-[4rem] text-center"
                  aria-label="Reset font size"
                  title="Reset font size to default (Ctrl/Cmd + 0)"
                >
                  {fontSize}px
                </button>
                <button 
                  onClick={increaseFontSize}
                  className="p-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-white"
                  aria-label="Increase font size"
                  title="Increase font size (Ctrl/Cmd + +)"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Font Size Info */}
            <p className="text-xs text-gray-500 mt-2">
              Use Ctrl/Cmd + +/- to adjust quickly, or Ctrl/Cmd + 0 to reset
            </p>
          </div>
          
          {/* Theme Selection */}
          <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">Reading Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => changeTheme('light')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  theme === 'light' 
                    ? 'border-amber-400 bg-amber-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label="Light theme"
              >
                <div className="w-full h-8 bg-white rounded border border-gray-200 mb-2"></div>
                <span className="text-xs font-medium text-gray-700">Light</span>
              </button>
              
              <button
                onClick={() => changeTheme('dark')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  theme === 'dark' 
                    ? 'border-amber-400 bg-amber-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label="Dark theme"
              >
                <div className="w-full h-8 bg-gray-800 rounded border border-gray-600 mb-2"></div>
                <span className="text-xs font-medium text-gray-700">Dark</span>
              </button>
              
              <button
                onClick={() => changeTheme('sepia')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  theme === 'sepia' 
                    ? 'border-amber-400 bg-amber-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label="Sepia theme"
              >
                <div className="w-full h-8 bg-amber-50 rounded border border-amber-200 mb-2"></div>
                <span className="text-xs font-medium text-gray-700">Sepia</span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Choose a comfortable reading theme for your eyes
            </p>
          </div>
          
          {/* Future settings can be added here */}
          {/* 
          <div className="border-t border-gray-100 pt-3 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            // Theme controls will go here
          </div>
          */}
        </div>
      </>
    )}

    <style>{`
      .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: #fffb91;
        border-radius: 3px;
      }
      
      /* Theme CSS Variables */
      .theme-light {
        --reader-bg: #ffffff;
        --reader-text: #1f2937;
        --reader-text-secondary: #6b7280;
        --reader-border: #e5e7eb;
        --reader-header-bg: #ffffff;
        --reader-sidebar-bg: #f9fafb;
        --reader-content-bg: #ffffff;
        --reader-hover: #f3f4f6;
        --reader-shadow: rgba(0, 0, 0, 0.1);
        --reader-highlight: #fffb91;
      }
      
      .theme-dark {
        --reader-bg: #111827;
        --reader-text: #f9fafb;
        --reader-text-secondary: #9ca3af;
        --reader-border: #374151;
        --reader-header-bg: #1f2937;
        --reader-sidebar-bg: #1f2937;
        --reader-content-bg: #111827;
        --reader-hover: #374151;
        --reader-shadow: rgba(0, 0, 0, 0.3);
        --reader-highlight: #fbbf24;
      }
      
      .theme-sepia {
        --reader-bg: #f7f3e9;
        --reader-text: #3c2e26;
        --reader-text-secondary: #8b6914;
        --reader-border: #e6d4b1;
        --reader-header-bg: #f0e68c;
        --reader-sidebar-bg: #faf7ed;
        --reader-content-bg: #faf8f0;
        --reader-hover: #f3f0e1;
        --reader-shadow: rgba(139, 105, 20, 0.1);
        --reader-highlight: #fde047;
      }
      
      /* Apply theme variables */
      .reader {
        background-color: var(--reader-bg);
        color: var(--reader-text);
        transition: background-color 0.3s ease, color 0.3s ease;
      }
      
      .reader-header {
        background-color: var(--reader-header-bg);
        border-bottom: 1px solid var(--reader-border);
        color: var(--reader-text);
      }
      
      .reader-sidebar {
        background-color: var(--reader-sidebar-bg);
        border-right: 1px solid var(--reader-border);
      }
      
      .reader-main {
        background-color: var(--reader-content-bg);
      }
      
      .epub-content {
        background-color: var(--reader-content-bg);
        color: var(--reader-text);
        transition: font-size 0.2s ease, background-color 0.3s ease, color 0.3s ease;
      }
      
      /* Theme-aware text colors */
      .theme-light .book-title,
      .theme-dark .book-title,
      .theme-sepia .book-title {
        color: var(--reader-text);
      }
      
      .theme-light .book-author,
      .theme-dark .book-author,
      .theme-sepia .book-author {
        color: var(--reader-text-secondary);
      }
      
      /* Theme-aware button styles */
      .theme-light .back-button,
      .theme-dark .back-button,
      .theme-sepia .back-button {
        color: var(--reader-text-secondary);
      }
      
      .theme-light .back-button:hover,
      .theme-dark .back-button:hover,
      .theme-sepia .back-button:hover {
        color: #d97706;
      }
      
      .theme-light .settings-button,
      .theme-light .mobile-toc-button,
      .theme-dark .settings-button,
      .theme-dark .mobile-toc-button,
      .theme-sepia .settings-button,
      .theme-sepia .mobile-toc-button {
        color: var(--reader-text-secondary);
      }
      
      .theme-light .settings-button:hover,
      .theme-light .mobile-toc-button:hover,
      .theme-dark .settings-button:hover,
      .theme-dark .mobile-toc-button:hover,
      .theme-sepia .settings-button:hover,
      .theme-sepia .mobile-toc-button:hover {
        color: #d97706;
      }
      
      /* Theme-aware highlight for TTS */
      .theme-light .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: var(--reader-highlight);
        color: #1f2937;
      }
      
      .theme-dark .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: var(--reader-highlight);
        color: #111827;
      }
      
      .theme-sepia .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: var(--reader-highlight);
        color: #3c2e26;
      }
      
      /* Theme-aware TOC drawer */
      .theme-dark .toc-drawer,
      .theme-sepia .toc-drawer {
        background-color: var(--reader-sidebar-bg);
        color: var(--reader-text);
      }
      
      .theme-dark .toc-drawer .border-gray-200,
      .theme-sepia .toc-drawer .border-gray-200 {
        border-color: var(--reader-border);
      }
      
      /* Settings widget theme adaptation */
      .theme-dark .settings-widget,
      .theme-sepia .settings-widget {
        background-color: var(--reader-sidebar-bg);
        border-color: var(--reader-border);
        color: var(--reader-text);
      }
      
      .theme-dark .settings-widget .text-gray-800,
      .theme-sepia .settings-widget .text-gray-800 {
        color: var(--reader-text);
      }
      
      .theme-dark .settings-widget .text-gray-700,
      .theme-sepia .settings-widget .text-gray-700 {
        color: var(--reader-text-secondary);
      }
      
      .theme-dark .settings-widget .bg-gray-50,
      .theme-sepia .settings-widget .bg-gray-50 {
        background-color: var(--reader-hover);
      }
      
      .theme-dark .settings-widget .bg-white,
      .theme-sepia .settings-widget .bg-white {
        background-color: var(--reader-content-bg);
        border-color: var(--reader-border);
      }
      
      .theme-dark .settings-widget .border-gray-200,
      .theme-sepia .settings-widget .border-gray-200 {
        border-color: var(--reader-border);
      }
      
      .theme-dark .settings-widget .border-gray-100,
      .theme-sepia .settings-widget .border-gray-100 {
        border-color: var(--reader-border);
      }
      
      /* Settings widget animations */
      .settings-widget {
        animation: slideInUp 0.2s ease-out;
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Settings backdrop animation */
      .settings-backdrop {
        animation: fadeIn 0.2s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      /* Mobile responsiveness for settings widget */
      @media (max-width: 640px) {
        .settings-widget {
          bottom: 1rem;
          right: 1rem;
          left: 1rem;
          min-width: auto;
          max-width: none;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
      }
      
      /* Extra small screens and phones in landscape */
      @media (max-width: 480px) {
        .settings-widget {
          bottom: 0.5rem;
          right: 0.5rem;
          left: 0.5rem;
          max-height: calc(100vh - 1rem);
          border-radius: 12px 12px 0 0;
          padding: 1rem;
        }
      }
      
      /* Very small screens */
      @media (max-width: 360px) {
        .settings-widget {
          bottom: 0;
          right: 0;
          left: 0;
          border-radius: 16px 16px 0 0;
          max-height: 85vh;
          padding: 1rem 0.75rem;
        }
        
        .settings-widget .grid-cols-3 {
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }
        
        .settings-widget .flex.items-center.space-x-3 {
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .settings-widget .flex.items-center.space-x-3 > * {
          margin: 0;
        }
      }
      
      /* Smooth transitions for theme changes */
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
      
      /* Ensure proper contrast for all themes */
      .theme-dark input,
      .theme-sepia input {
        background-color: var(--reader-content-bg);
        color: var(--reader-text);
        border-color: var(--reader-border);
      }
      
      .theme-dark button,
      .theme-sepia button {
        color: var(--reader-text);
      }
      
      /* Loading overlay theme adaptation */
      .theme-dark .loading-overlay,
      .theme-sepia .loading-overlay {
        background-color: var(--reader-bg);
        color: var(--reader-text);
      }
      
      /* Mobile header responsiveness */
      @media (max-width: 768px) {
        .reader-header {
          padding: 0.5rem;
          min-height: 60px;
        }
        
        .reader-left .back-button {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
        
        .reader-left .back-button .w-4 {
          width: 0.875rem;
          height: 0.875rem;
        }
        
        .reader-center {
          flex: 1;
          min-width: 0;
          padding: 0 0.5rem;
        }
        
        .reader-center .book-title {
          font-size: 0.9rem;
          line-height: 1.2;
          margin-bottom: 0.125rem;
        }
        
        .reader-center .book-author {
          font-size: 0.75rem;
        }
        
        .reader-right {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .settings-button,
        .mobile-toc-button {
          padding: 0.375rem;
          margin-right: 0.25rem;
        }
        
        .settings-button .w-5,
        .mobile-toc-button .w-5 {
          width: 1rem;
          height: 1rem;
        }
        
        .controls-container {
          margin-left: 0.25rem;
        }
      }
      
      /* Extra small mobile screens */
      @media (max-width: 480px) {
        .reader-header {
          padding: 0.375rem;
          min-height: 56px;
        }
        
        .reader-left .back-button {
          font-size: 0.7rem;
          padding: 0.25rem;
        }
        
        .reader-center .book-title {
          font-size: 0.8rem;
        }
        
        .reader-center .book-author {
          font-size: 0.7rem;
        }
        
        .settings-button,
        .mobile-toc-button {
          padding: 0.25rem;
          margin-right: 0.125rem;
        }
        
        .settings-button .w-5,
        .mobile-toc-button .w-5 {
          width: 0.875rem;
          height: 0.875rem;
        }
      }
      
      /* Landscape phone adjustments */
      @media (max-width: 768px) and (orientation: landscape) {
        .reader-header {
          min-height: 48px;
          padding: 0.25rem 0.5rem;
        }
        
        .reader-center .book-title {
          font-size: 0.8rem;
        }
        
        .reader-center .book-author {
          font-size: 0.7rem;
        }
      }
      
      /* Controls component theme adaptation */
      .theme-light .control-button {
        background-color: #f9fafb;
        border-color: #e5e7eb;
        color: #374151;
      }
      
      .theme-dark .control-button {
        background-color: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }
      
      .theme-sepia .control-button {
        background-color: #faf7ed;
        border-color: #e6d4b1;
        color: #3c2e26;
      }
      
      /* Control button hover states */
      .theme-light .control-button:hover:not(:disabled) {
        background-color: #f3f4f6;
        border-color: #d1d5db;
      }
      
      .theme-dark .control-button:hover:not(:disabled) {
        background-color: #4b5563;
        border-color: #6b7280;
      }
      
      .theme-sepia .control-button:hover:not(:disabled) {
        background-color: #f3f0e1;
        border-color: #d4c399;
      }
      
      /* Active control buttons (all themes keep amber) */
      .theme-light .control-button.active,
      .theme-dark .control-button.active,
      .theme-sepia .control-button.active {
        background-color: #92400e;
        border-color: #92400e;
        color: white;
      }
      
      .theme-light .control-button.active:hover:not(:disabled),
      .theme-dark .control-button.active:hover:not(:disabled),
      .theme-sepia .control-button.active:hover:not(:disabled) {
        background-color: #78350f;
      }
      
      /* Stop button theme adaptation */
      .theme-light .control-button.stop-button {
        background-color: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      
      .theme-dark .control-button.stop-button {
        background-color: #450a0a;
        border-color: #7f1d1d;
        color: #fca5a5;
      }
      
      .theme-sepia .control-button.stop-button {
        background-color: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      
      .theme-light .control-button.stop-button:hover:not(:disabled) {
        background-color: #fee2e2;
        border-color: #fca5a5;
      }
      
      .theme-dark .control-button.stop-button:hover:not(:disabled) {
        background-color: #7f1d1d;
        border-color: #991b1b;
      }
      
      .theme-sepia .control-button.stop-button:hover:not(:disabled) {
        background-color: #fee2e2;
        border-color: #fca5a5;
      }
      
      /* Page info theme adaptation */
      .theme-light .page-info {
        color: #4b5563;
      }
      
      .theme-dark .page-info {
        color: #9ca3af;
      }
      
      .theme-sepia .page-info {
        color: #8b6914;
      }
    `}</style>
  </div>
 );
};

export default Reader;
