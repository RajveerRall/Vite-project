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
import { ChevronLeft, ChevronRight, Play, Headphones } from 'lucide-react'; // Or your preferred icon library


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



  // Cleanup for all buffered audio blobs on unmount
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

        // const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const textChunk = chunksToFetch[i];
        const response = await fetch(`https://api.yoread.com/api/tts?text=${encodeURIComponent(textChunk)}&voice=en-US-BrianMultilingualNeural&format=audio-24khz-48kbitrate-mono-mp3`);
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
      console.log(`[playChunk] Playing chunk #${index} from BUFFER.`);
      playAudio(audioBuffer.current[index]);
    } else {
      console.log(`[playChunk] Playing chunk #${index} from NETWORK.`);
      try {
        const textChunk = chunks[index];
        const response = await fetch(`/api/tts?text=${encodeURIComponent(textChunk)}&voice=en-US-BrianMultilingualNeural&format=audio-24khz-48kbitrate-mono-mp3`);
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

  // Navigation handlers wrapped to stop TTS
  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    commonTTSStopAndSaveLogic();
    navigateToTocItem(item);
  }, [commonTTSStopAndSaveLogic, navigateToTocItem]);

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
  <div className="reader">
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
      <div className="reader-sidebar">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>
      <div className="reader-main">
        {/* <SearchBar /> */}
        {/* Render React nodes here, no dangerouslySetInnerHTML */}
        <div className="epub-content" style={{ whiteSpace: 'pre-wrap' }}>
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

    <style>{`
      .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: #fffb91;
        border-radius: 3px;
      }
    `}</style>
  </div>
 );
};

export default Reader;
