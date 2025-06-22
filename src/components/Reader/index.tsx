// // import React, { useState, useEffect, useCallback, useRef } from 'react';
// // import { useBook } from '../../context/BookContext';
// // import { TTSService } from '../../services/msedge';
// // import SimplePlayMode from './SimplePlayMode';
// // import KokoroPlayMode from './SimplePlayMode';
// // import TableOfContents from '../Library/TableOfContents';
// // import SearchBar from '../Library/SearchBar';
// // import Controls from './Controls';
// // import { TOCItem } from '../../types/books';
// // import './Reader.css';
// // import FeatureHighlight from './FeatureHighlight';

// // const ttsService = TTSService.getInstance();
// // const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';

// // const Reader: React.FC = () => {
// //   const {
// //     bookTitle,
// //     bookAuthor,
// //     currentPage,
// //     currentPageDisplay,
// //     totalPages,
// //     currentContent,
// //     toc,
// //     closeBook,
// //     nextPage,
// //     prevPage,
// //     navigateToTocItem,
// //     isPlayModeVisible,
// //     togglePlayMode,
// //     currentPageText,
// //     isLoading
// //   } = useBook();

// //   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
// //   const [isSpeaking, setIsSpeaking] = useState(false);
// //   const [isProcessing, setIsProcessing] = useState(false);
// //   const [isPaused, setIsPaused] = useState(false);
// //   const [resumeIndex, setResumeIndex] = useState<number | null>(null);
// //   const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false);
// //   const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(true);

// //   // Ref to store the character offset within currentPageText from which the current TTS playback started
// //   const currentTTSBaseOffsetRef = useRef<number>(0);

// //   const getStorageKey = useCallback((): string | null => {
// //     if (!bookTitle) return null;
// //     const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
// //     return `${LOCAL_STORAGE_PREFIX}${safeTitle}`;
// //   }, [bookTitle]);

// //   const saveResumeIndex = useCallback((index: number) => {
// //     const key = getStorageKey();
// //     if (key && index >= 0) {
// //       try {
// //         const data = { page: currentPage, index: index };
// //         localStorage.setItem(key, JSON.stringify(data));
// //         console.log(`Saved progress: Page ${currentPage}, Index ${index} for key ${key}`);
// //       } catch (error) {
// //         console.error("Error saving progress to localStorage:", error);
// //       }
// //     }
// //   }, [currentPage, getStorageKey]);

// //   const loadResumeIndex = useCallback((): number | null => {
// //     const key = getStorageKey();
// //     if (key) {
// //       try {
// //         const savedData = localStorage.getItem(key);
// //         if (savedData) {
// //           const data = JSON.parse(savedData);
// //           if (data && typeof data.page === 'number' && data.page === currentPage && typeof data.index === 'number') {
// //             if (currentPageText && data.index >= currentPageText.length) {
// //                  console.warn(`Loaded index ${data.index} is out of bounds for page ${currentPage}. Clearing.`);
// //                  localStorage.removeItem(key);
// //                  return null;
// //             }
// //             console.log(`Loaded progress: Page ${data.page}, Index ${data.index} for key ${key}`);
// //             return data.index;
// //           } else if (data && data.page !== currentPage) {
// //              console.log(`Saved progress page ${data.page} doesn't match current page ${currentPage}. Clearing.`);
// //              localStorage.removeItem(key);
// //           }
// //         }
// //       } catch (error) {
// //         console.error("Error loading progress from localStorage:", error);
// //         localStorage.removeItem(key);
// //       }
// //     }
// //     return null;
// //   }, [currentPage, getStorageKey, currentPageText]);

// //   const clearResumeIndex = useCallback(() => {
// //     const key = getStorageKey();
// //     if (key) {
// //       try {
// //         localStorage.removeItem(key);
// //         console.log(`Cleared progress for key ${key}`);
// //       } catch (error) {
// //         console.error("Error clearing progress from localStorage:", error);
// //       }
// //     }
// //     setResumeIndex(null);
// //   }, [getStorageKey]);

// //   useEffect(() => {
// //     if (bookTitle && currentPageText !== undefined) {
// //       const loadedIndex = loadResumeIndex();
// //       setResumeIndex(loadedIndex);
// //       setHasFinishedPlayback(false);
// //     } else if (!bookTitle) {
// //       setResumeIndex(null);
// //       currentTTSBaseOffsetRef.current = 0;
// //     }
// //   }, [currentPage, bookTitle, loadResumeIndex, currentPageText]);

// //   useEffect(() => {
// //     let wasActiveLastCheck = false;

// //     const checkStatus = () => {
// //       const currentlyPlaying = ttsService.isCurrentlyPlaying();
// //       const currentlyPaused = ttsService.isCurrentlyPaused();
// //       const currentlyProcessing = ttsService.isCurrentlyProcessing();
// //       const sessionActive = ttsService.isSessionActive();

// //       setIsSpeaking(currentlyPlaying);
// //       setIsPaused(currentlyPaused);
// //       setIsProcessing(currentlyProcessing && !sessionActive);

// //       if (wasActiveLastCheck && !sessionActive && !currentlyProcessing) {
// //         console.log("Playback session appears to have finished naturally.");
// //         setHasFinishedPlayback(true);
// //         clearResumeIndex();
// //         currentTTSBaseOffsetRef.current = 0;
// //       }
// //       wasActiveLastCheck = sessionActive;
// //     };

// //     checkStatus();
// //     const intervalId = setInterval(checkStatus, 500);
// //     return () => clearInterval(intervalId);
// //   }, [clearResumeIndex]);

// //   const saveCurrentProgress = useCallback(() => {
// //     if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
// //       const pausedIndexInSpokenSegment = ttsService.getCurrentPlaybackStartIndex();
// //       if (pausedIndexInSpokenSegment >= 0) {
// //         const absoluteIndex = currentTTSBaseOffsetRef.current + pausedIndexInSpokenSegment;
// //         saveResumeIndex(absoluteIndex);
// //         setHasFinishedPlayback(false);
// //       } else {
// //         console.warn("Tried to save progress, but got invalid index from TTS service:", pausedIndexInSpokenSegment);
// //       }
// //     }
// //   }, [saveResumeIndex]);

// //   useEffect(() => {
// //     return () => {
// //       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
// //         console.log("Reader cleanup: Saving progress before stopping TTS.");
// //         saveCurrentProgress();
// //         console.log("Reader cleanup: Stopping active TTS session.");
// //         ttsService.stopAudio();
// //       }
// //     };
// //   }, [currentPage, saveCurrentProgress]);

// //   const handleTTS = useCallback(async () => {
// //     if (isPaused) {
// //       console.log("Reader: Resuming audio from paused state.");
// //       ttsService.resumeAudio();
// //       return;
// //     }
// //     if (isSpeaking) {
// //       console.log("Reader: Pausing audio.");
// //       ttsService.pauseAudio();
// //       saveCurrentProgress();
// //       return;
// //     }

// //     if (!isProcessing && currentPageText) {
// //       let textToSpeak = currentPageText;
// //       let speakFromOffset = 0;

// //       if (resumeIndex !== null && resumeIndex >= 0 && !hasFinishedPlayback) {
// //           if (resumeIndex < currentPageText.length) {
// //             console.log(`Reader: Attempting to resume from saved index: ${resumeIndex}`);
// //             speakFromOffset = resumeIndex;
// //             textToSpeak = currentPageText.substring(resumeIndex);
// //           } else {
// //             console.warn(`Reader: Saved resumeIndex ${resumeIndex} is out of bounds for currentPageText. Reading from start.`);
// //             clearResumeIndex();
// //             speakFromOffset = 0;
// //             textToSpeak = currentPageText;
// //           }
// //       }
// //       else {
// //           const selection = window.getSelection();
// //           const selectedText = selection?.toString().trim();

// //           if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
// //               console.log(`Reader: User selected text: "${selectedText.substring(0, 50)}..."`);
// //               const startIndex = currentPageText.indexOf(selectedText);
// //               if (startIndex !== -1) {
// //                   console.log(`Reader: Found selection at index ${startIndex}. Reading from selection.`);
// //                   speakFromOffset = startIndex;
// //                   textToSpeak = currentPageText.substring(startIndex);
// //                   clearResumeIndex();
// //               } else {
// //                   console.warn(`Reader: Could not match selection. Reading full page.`);
// //                   clearResumeIndex();
// //                   speakFromOffset = 0;
// //                   textToSpeak = currentPageText;
// //               }
// //           }
// //           else {
// //               console.log("Reader: Reading full page from the beginning.");
// //               clearResumeIndex();
// //               speakFromOffset = 0;
// //               textToSpeak = currentPageText;
// //           }
// //       }

// //       if (!textToSpeak) {
// //           console.warn("Reader: No text determined to speak.");
// //           setIsProcessing(false);
// //           return;
// //       }

// //       console.log(`Reader: Attempting to speak text (first 100 chars): "${textToSpeak.substring(0, 100)}..." from offset ${speakFromOffset}`);
// //       currentTTSBaseOffsetRef.current = speakFromOffset;
// //       setHasFinishedPlayback(false);

// //       try {
// //         setIsProcessing(true);

// //         await ttsService.speakTextInChunks(textToSpeak, {
// //           voice: 'en-US-BrianMultilingualNeural',
// //           format: 'audio-24khz-48kbitrate-mono-mp3',
// //           rate: 1.0,
// //           pitch: '+0Hz'
// //         });
// //       } catch (error) {
// //         console.error('TTS Error starting playback:', error);
// //         ttsService.stopAudio();
// //         setIsSpeaking(false);
// //         setIsPaused(false);
// //         setIsProcessing(false);
// //         currentTTSBaseOffsetRef.current = 0;
// //       }
// //     } else if (!currentPageText) {
// //         console.warn("Reader: Cannot start TTS, currentPageText is empty or undefined.");
// //     } else if (isProcessing) {
// //         console.log("Reader: Already processing TTS, ignoring request.");
// //     }
// //   }, [
// //     isPaused,
// //     isSpeaking,
// //     isProcessing,
// //     currentPageText,
// //     resumeIndex,
// //     hasFinishedPlayback,
// //     saveCurrentProgress,
// //     clearResumeIndex,
// //   ]);

// //   const handleNavigateToTocItem = useCallback((item: TOCItem) => {
// //       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
// //           saveCurrentProgress();
// //           ttsService.stopAudio();
// //       }
// //       navigateToTocItem(item);
// //       currentTTSBaseOffsetRef.current = 0;
// //       setResumeIndex(null);
// //   }, [navigateToTocItem, saveCurrentProgress]);

// //   const handlePrevPage = useCallback(() => {
// //       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
// //         saveCurrentProgress();
// //         ttsService.stopAudio();
// //       }
// //       prevPage();
// //       currentTTSBaseOffsetRef.current = 0;
// //       setResumeIndex(null);
// //   }, [prevPage, saveCurrentProgress]);

// //   const handleNextPage = useCallback(() => {
// //       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
// //         saveCurrentProgress();
// //         ttsService.stopAudio();
// //       }
// //       nextPage();
// //       currentTTSBaseOffsetRef.current = 0;
// //       setResumeIndex(null);
// //   }, [nextPage, saveCurrentProgress]);

// //   const handleCloseBook = useCallback(() => {
// //         if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
// //             saveCurrentProgress();
// //             ttsService.stopAudio();
// //         }
// //         closeBook();
// //         currentTTSBaseOffsetRef.current = 0;
// //         setResumeIndex(null);
// //   }, [closeBook, saveCurrentProgress]);

// //   return (
// //     <div className="reader">
// //       <header className="reader-header">
// //         <div className="reader-left">
// //           <button onClick={handleCloseBook} className="back-button">
// //             ← Back to Library
// //           </button>
// //         </div>
// //         <div className="reader-center">
// //           <h2 className="book-title">{bookTitle}</h2>
// //           <p className="book-author">{bookAuthor}</p>
// //         </div>
// //         <div className="reader-right">
// //           <div className="controls-container">
// //             <Controls
// //               currentPage={currentPage}
// //               totalPages={totalPages}
// //               onPrevious={handlePrevPage}
// //               onNext={handleNextPage}
// //               onReadAloud={handleTTS}
// //               isReading={isSpeaking}
// //               isPaused={isPaused}
// //               isProcessing={isProcessing}
// //               canResume={resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback}
// //               onAudiobook={togglePlayMode}
// //               isPlayModeActive={isPlayModeVisible}
// //               isReadButtonActive={isSpeaking || isPaused || (resumeIndex !== null && !isProcessing && !hasFinishedPlayback)}
// //             />
// //           </div>
// //         </div>
// //       </header>

// //       <div className="reader-container">
// //         {(isLoading || isProcessing) && (
// //           <div className="loading-overlay">
// //             <div className="loading-spinner"></div>
// //             <p>{isLoading ? 'Loading book...' : isProcessing ? 'Preparing audio...' : 'Loading...'}</p>
// //           </div>
// //         )}
// //         <div className="reader-sidebar">
// //           <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
// //         </div>
// //         <div className="reader-main">
// //           <SearchBar />
// //           <div
// //             className="epub-content"
// //             dangerouslySetInnerHTML={{ __html: currentContent }}
// //           ></div>
// //         </div>
// //         {isPlayModeVisible && (
// //           useKokoroTTS ? (
// //             <KokoroPlayMode
// //               currentPageContent={currentPageText}
// //               onClose={togglePlayMode}
// //             />
// //           ) : (
// //             <SimplePlayMode
// //               currentPageContent={currentPageText}
// //               onClose={togglePlayMode}
// //             />
// //           )
// //         )}
// //       </div>

// //       {showFeatureHighlight && (
// //         <FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />
// //       )}
// //     </div>
// //   );
// // };

// // export default Reader;

// // src/components/Reader/index.tsx
// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useBook } from '../../context/BookContext';
// import { TTSService } from '../../services/msedge'; // Assuming this path is correct
// import SimplePlayMode from './SimplePlayMode';
// import KokoroPlayMode from './SimplePlayMode'; // Assuming KokoroPlayMode is also SimplePlayMode or similar
// import TableOfContents from '../Library/TableOfContents'; // Adjust path if needed
// import SearchBar from '../Library/SearchBar'; // Adjust path if needed
// import Controls from './Controls';
// import { TOCItem } from '../../types/books';
// import './Reader.css';
// import FeatureHighlight from './FeatureHighlight';

// const ttsService = TTSService.getInstance();
// const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_'; // For TTS resume progress

// const Reader: React.FC = () => {
//   const {
//     bookTitle,
//     bookAuthor,
//     currentPageDisplay, // Renamed from currentPage
//     totalPages,
//     currentContent,
//     toc,
//     closeBook,
//     nextPage,
//     prevPage,
//     navigateToTocItem,
//     isPlayModeVisible,
//     togglePlayMode,
//     currentPageText,
//     isLoading // Global loading from BookContext
//     // isPageLoading, // You might also want isPageLoading if Reader needs to show a specific page loading state
//   } = useBook();

//   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false); // Or your default
//   const [isSpeaking, setIsSpeaking] = useState(false); // TTS is actively outputting audio
//   const [isProcessing, setIsProcessing] = useState(false); // TTS is fetching/preparing audio
//   const [isPaused, setIsPaused] = useState(false); // TTS is paused mid-playback
//   const [resumeIndex, setResumeIndex] = useState<number | null>(null); // Character index for TTS resume
//   const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false); // If TTS completed the current text
//   const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(true); // Or based on some logic

//   const currentTTSBaseOffsetRef = useRef<number>(0);

//   // --- TTS Resume Logic (using localStorage, specific to Reader.tsx) ---
//   const getStorageKey = useCallback((): string | null => {
//     if (!bookTitle) return null;
//     const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
//     // IMPORTANT: Include page number in the key for TTS resume to be page-specific
//     return `${LOCAL_STORAGE_PREFIX}${safeTitle}_page${currentPageDisplay}`;
//   }, [bookTitle, currentPageDisplay]);

//   const saveResumeIndex = useCallback((index: number) => {
//     const key = getStorageKey();
//     if (key && index >= 0) {
//       try {
//         // No need to store 'page' in the data if the key itself is page-specific
//         const data = { index: index };
//         localStorage.setItem(key, JSON.stringify(data));
//         console.log(`[TTS Resume] Saved progress: Index ${index} for key ${key} (Page ${currentPageDisplay})`);
//       } catch (error) {
//         console.error("[TTS Resume] Error saving progress to localStorage:", error);
//       }
//     }
//   }, [currentPageDisplay, getStorageKey]); // Added currentPageDisplay

//   const loadResumeIndex = useCallback((): number | null => {
//     const key = getStorageKey(); // Key is now page-specific
//     if (key) {
//       try {
//         const savedData = localStorage.getItem(key);
//         if (savedData) {
//           const data = JSON.parse(savedData);
//           // Only need to check for index, as page is part of the key
//           if (data && typeof data.index === 'number') {
//             if (currentPageText && data.index >= currentPageText.length) {
//                  console.warn(`[TTS Resume] Loaded index ${data.index} is out of bounds for page ${currentPageDisplay}. Clearing.`);
//                  localStorage.removeItem(key);
//                  return null;
//             }
//             console.log(`[TTS Resume] Loaded progress: Index ${data.index} for key ${key} (Page ${currentPageDisplay})`);
//             return data.index;
//           }
//         }
//       } catch (error) {
//         console.error("[TTS Resume] Error loading progress from localStorage:", error);
//         localStorage.removeItem(key); // Clear corrupted data
//       }
//     }
//     return null;
//   }, [currentPageDisplay, getStorageKey, currentPageText]); // Added currentPageDisplay

//   const clearResumeIndex = useCallback(() => {
//     const key = getStorageKey(); // Key is page-specific
//     if (key) {
//       try {
//         localStorage.removeItem(key);
//         console.log(`[TTS Resume] Cleared progress for key ${key} (Page ${currentPageDisplay})`);
//       } catch (error) {
//         console.error("[TTS Resume] Error clearing progress from localStorage:", error);
//       }
//     }
//     setResumeIndex(null);
//   }, [currentPageDisplay, getStorageKey]); // Added currentPageDisplay

//   // Load TTS resume index when page, book, or text changes
//   useEffect(() => {
//     if (bookTitle && currentPageText !== undefined) { // currentPageText being defined means page content is ready
//       const loadedIndex = loadResumeIndex();
//       setResumeIndex(loadedIndex);
//       setHasFinishedPlayback(false); // Reset playback finished flag for new page/text
//       currentTTSBaseOffsetRef.current = 0; // Reset base offset
//       console.log(`[TTS Resume] Effect for page ${currentPageDisplay}: Loaded TTS resumeIndex: ${loadedIndex}`);
//     } else if (!bookTitle) {
//       setResumeIndex(null);
//       currentTTSBaseOffsetRef.current = 0;
//     }
//     // Adding loadResumeIndex to dependencies. It's memoized with currentPageDisplay.
//   }, [currentPageDisplay, bookTitle, currentPageText, loadResumeIndex]);

//   // TTS Status Polling
//   useEffect(() => {
//     let wasActiveLastCheck = false;
//     const checkStatus = () => {
//       const currentlyPlaying = ttsService.isCurrentlyPlaying();
//       const currentlyPaused = ttsService.isCurrentlyPaused();
//       const currentlyProcessing = ttsService.isCurrentlyProcessing(); // Assuming this means fetching/buffering
//       const sessionActive = ttsService.isSessionActive(); // Assuming this means a speak command was issued and not yet fully stopped/completed

//       setIsSpeaking(currentlyPlaying);
//       setIsPaused(currentlyPaused);
//       // Only set processing if it's truly just fetching, not if it's also playing/paused
//       setIsProcessing(currentlyProcessing && !currentlyPlaying && !currentlyPaused);

//       // Detect natural end of playback
//       if (wasActiveLastCheck && !sessionActive && !currentlyProcessing && !currentlyPlaying && !isPaused) {
//         console.log("[TTS Status] Playback session appears to have finished naturally.");
//         setHasFinishedPlayback(true);
//         clearResumeIndex(); // Clear saved index for the current page as it's fully read
//         currentTTSBaseOffsetRef.current = 0;
//       }
//       wasActiveLastCheck = sessionActive || currentlyPlaying || currentlyPaused; // Consider active if any of these are true
//     };
//     checkStatus(); // Initial check
//     const intervalId = setInterval(checkStatus, 300); // Poll slightly faster
//     return () => clearInterval(intervalId);
//   }, [clearResumeIndex, isPaused]); // Added isPaused as it can affect natural finish detection

//   // Save TTS progress if speaking or paused
//   const saveCurrentTTSProgress = useCallback(() => {
//     if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
//       const pausedIndexInSpokenSegment = ttsService.getCurrentPlaybackStartIndex(); // Index within the current CHUNK being spoken
//       if (pausedIndexInSpokenSegment >= 0) {
//         const absoluteIndexOnPage = currentTTSBaseOffsetRef.current + pausedIndexInSpokenSegment;
//         saveResumeIndex(absoluteIndexOnPage);
//         setHasFinishedPlayback(false); // If saving progress, it means it hasn't finished
//       } else {
//         // This might happen if TTS hasn't started the first chunk yet or an error occurred
//         console.warn("[TTS Progress] Tried to save progress, but got invalid index from TTS service:", pausedIndexInSpokenSegment);
//       }
//     }
//   }, [saveResumeIndex]);

//   // Cleanup TTS and save progress on component unmount or when dependencies like page change
//   useEffect(() => {
//     return () => { // Cleanup function
//       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
//         console.log("[Reader Cleanup] Component unmounting or critical deps changing. Saving TTS progress.");
//         saveCurrentTTSProgress();
//         console.log("[Reader Cleanup] Stopping active TTS session.");
//         ttsService.stopAudio(); // Force stop
//       }
//     };
//     // This effect should run if the book itself changes (bookTitle) or the page (currentPageDisplay)
//     // It ensures that if the user navigates away while TTS is active for *this specific page*, its progress is saved.
//   }, [currentPageDisplay, bookTitle, saveCurrentTTSProgress]);


//   const handleTTS = useCallback(async () => {
//     if (isProcessing) {
//         console.log("[handleTTS] Already processing, request ignored.");
//         return;
//     }
//     if (isPaused) {
//       console.log("[handleTTS] Resuming audio from paused state.");
//       ttsService.resumeAudio();
//       // isPaused will be set to false by the poller
//       return;
//     }
//     if (isSpeaking) {
//       console.log("[handleTTS] Pausing audio.");
//       ttsService.pauseAudio();
//       saveCurrentTTSProgress(); // Save exact pause position
//       // isSpeaking/isPaused will be updated by poller
//       return;
//     }

//     // --- Start new TTS session ---
//     if (currentPageText) {
//       let textToSpeak = currentPageText;
//       let speakFromOffset = 0; // Character offset on the current page

//       // Priority 1: Resume from saved index for this page (if not fully played back)
//       if (resumeIndex !== null && resumeIndex >= 0 && !hasFinishedPlayback) {
//           if (resumeIndex < currentPageText.length) {
//             console.log(`[handleTTS] Attempting to resume TTS from saved index: ${resumeIndex}`);
//             speakFromOffset = resumeIndex;
//           } else {
//             console.warn(`[handleTTS] Saved resumeIndex ${resumeIndex} is out of bounds. Reading page from start.`);
//             clearResumeIndex(); // Clear invalid index
//           }
//       }
//       // Priority 2: Selected text
//       else {
//           const selection = window.getSelection();
//           const selectedText = selection?.toString().trim();
//           // Ensure selection is within the .epub-content area
//           if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
//               const startIndexInPage = currentPageText.indexOf(selectedText);
//               if (startIndexInPage !== -1) {
//                   console.log(`[handleTTS] User selected text. Reading from selection index ${startIndexInPage}.`);
//                   speakFromOffset = startIndexInPage;
//                   clearResumeIndex(); // New selection overrides old resume index
//               } else {
//                   console.warn(`[handleTTS] Could not match selected text within currentPageText. Reading page from start.`);
//                   clearResumeIndex();
//               }
//           }
//           // Priority 3: Read from beginning of the page
//           else {
//               console.log("[handleTTS] No resume index or selection. Reading page from the beginning.");
//               clearResumeIndex();
//           }
//       }

//       textToSpeak = currentPageText.substring(speakFromOffset);
//       currentTTSBaseOffsetRef.current = speakFromOffset; // Store the starting point of this TTS session on the page

//       if (!textToSpeak.trim()) {
//           console.warn("[handleTTS] No text determined to speak (text is empty or whitespace).");
//           if (speakFromOffset > 0 && speakFromOffset >= currentPageText.length -1) { // If tried to resume at/after end
//             setHasFinishedPlayback(true); // Mark as finished for this attempt
//             clearResumeIndex();
//           }
//           return;
//       }

//       console.log(`[handleTTS] Speaking from offset ${currentTTSBaseOffsetRef.current}. Text sample: "${textToSpeak.substring(0, 100)}..."`);
//       setHasFinishedPlayback(false); // Reset for new playback

//       try {
//         setIsProcessing(true); // Indicate we are now fetching/preparing audio
//         // State changes (isSpeaking, isPaused) will be handled by the poller based on ttsService state
//         await ttsService.speakTextInChunks(textToSpeak, {
//           voice: 'en-US-BrianMultilingualNeural', // Example voice
//           format: 'audio-24khz-48kbitrate-mono-mp3',
//           rate: 1.0,
//           pitch: '+0Hz'
//         });
//         // speakTextInChunks should manage its own playing state internally.
//         // Our poller will reflect that.
//       } catch (error) {
//         console.error('[handleTTS] TTS Error during speakTextInChunks:', error);
//         ttsService.stopAudio(); // Ensure cleanup
//         setIsSpeaking(false); setIsPaused(false); setIsProcessing(false);
//         currentTTSBaseOffsetRef.current = 0;
//       }
//     } else {
//         console.warn("[handleTTS] Cannot start TTS, currentPageText is empty or undefined.");
//     }
//   }, [
//     isPaused, isSpeaking, isProcessing, currentPageText,
//     resumeIndex, hasFinishedPlayback,
//     saveCurrentTTSProgress, clearResumeIndex,
//   ]);

//   // --- Wrappers for navigation functions to handle TTS state ---
//   const handleNavigateToTocItem = useCallback((item: TOCItem) => {
//       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
//           saveCurrentTTSProgress();
//           ttsService.stopAudio();
//       }
//       navigateToTocItem(item);
//       // TTS resume state for the new page will be handled by the useEffect watching currentPageDisplay
//   }, [navigateToTocItem, saveCurrentTTSProgress]);

//   const handlePrevPage = useCallback(() => {
//       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
//         saveCurrentTTSProgress();
//         ttsService.stopAudio();
//       }
//       prevPage();
//   }, [prevPage, saveCurrentTTSProgress]);

//   const handleNextPage = useCallback(() => {
//       if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
//         saveCurrentTTSProgress();
//         ttsService.stopAudio();
//       }
//       nextPage();
//   }, [nextPage, saveCurrentTTSProgress]);

//   const handleCloseBookCB = useCallback(() => { // Renamed to avoid conflict with closeBook from context
//         if (ttsService.isSessionActive() || ttsService.isCurrentlyPaused()) {
//             saveCurrentTTSProgress();
//             ttsService.stopAudio();
//         }
//         closeBook(); // Call the closeBook from context
//   }, [closeBook, saveCurrentTTSProgress]);


//   // Determine canResume for Controls component
//   // TTS can resume if there's a saved index, TTS is not active/paused/processing, and playback hasn't finished for this index
//   const canTTSResume = resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback;

//   return (
//     <div className="reader">
//       <header className="reader-header">
//         <div className="reader-left">
//           <button onClick={handleCloseBookCB} className="back-button">
//             ← Back to Library
//           </button>
//         </div>
//         <div className="reader-center">
//           <h2 className="book-title">{bookTitle}</h2>
//           <p className="book-author">{bookAuthor}</p>
//         </div>
//         <div className="reader-right">
//           <div className="controls-container">
//             <Controls
//               currentPage={currentPageDisplay}
//               totalPages={totalPages}
//               onPrevious={handlePrevPage}
//               onNext={handleNextPage}
//               onReadAloud={handleTTS}
//               isReading={isSpeaking}
//               isPaused={isPaused}
//               isProcessing={isProcessing} // Pass the specific TTS processing state
//               canResume={canTTSResume}
//               onAudiobook={togglePlayMode}
//               isPlayModeActive={isPlayModeVisible}
//               isReadButtonActive={isSpeaking || isPaused || canTTSResume}
//             />
//           </div>
//         </div>
//       </header>

//       <div className="reader-container">
//         {(isLoading || isProcessing ) && ( // Show overlay if book context is loading OR TTS is processing
//           <div className="loading-overlay">
//             <div className="loading-spinner"></div>
//             <p>
//               {isLoading && !isProcessing ? 'Loading book...' : ''}
//               {isProcessing ? 'Preparing audio...' : ''}
//               {isLoading && isProcessing ? 'Loading book & audio...' : ''}
//             </p>
//           </div>
//         )}
//         <div className="reader-sidebar">
//           <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
//         </div>
//         <div className="reader-main">
//           <SearchBar /> {/* Assuming SearchBar is correctly implemented */}
//           <div
//             className="epub-content"
//             dangerouslySetInnerHTML={{ __html: currentContent }}
//             // Consider adding an onScroll handler here if you want to save scroll position
//           ></div>
//         </div>
//         {isPlayModeVisible && (
//           useKokoroTTS ? (
//             <KokoroPlayMode
//               currentPageContent={currentPageText}
//               onClose={togglePlayMode}
//             />
//           ) : (
//             <SimplePlayMode
//               currentPageContent={currentPageText}
//               onClose={togglePlayMode}
//             />
//           )
//         )}
//       </div>

//       {showFeatureHighlight && (
//         <FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />
//       )}
//     </div>
//   );
// };

// export default Reader;
// src/components/Reader/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBook } from '../../context/BookContext';
import { TTSService } from '../../services/msedge';
// ... other imports from your current file (SimplePlayMode, KokoroPlayMode, TableOfContents, SearchBar, Controls, TOCItem, './Reader.css', FeatureHighlight)
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import { TOCItem } from '../../types/books';
import './Reader.css';
import FeatureHighlight from './FeatureHighlight';


const ttsService = TTSService.getInstance();
const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';

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

  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false);
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(true);

  const currentTTSBaseOffsetRef = useRef<number>(0);
  const readerInstanceId = useRef(`ReaderInstance_${Date.now()}_${Math.random().toString(36).substring(2,7)}`).current;
  const ttsIntentActiveRef = useRef(false);


  const getStorageKey = useCallback((): string | null => {
    if (!bookTitle) return null;
    const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${LOCAL_STORAGE_PREFIX}${safeTitle}_page${currentPageDisplay}`;
  }, [bookTitle, currentPageDisplay]);

  const saveResumeIndex = useCallback((index: number) => {
    const key = getStorageKey();
    if (key && index >= 0) {
      try {
        const data = { index: index };
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`%c[${readerInstanceId}][TTS Resume Save] Page ${currentPageDisplay}: Saved Index ${index} for key ${key}`, "color: blue;");
      } catch (error) { console.error(`%c[${readerInstanceId}][TTS Resume Save] Page ${currentPageDisplay}: Error saving:`, "color: red;", error); }
    } else { console.warn(`%c[${readerInstanceId}][TTS Resume Save] Page ${currentPageDisplay}: Could not save. Key: ${key}, Index: ${index}`, "color: orange;");}
  }, [currentPageDisplay, getStorageKey, readerInstanceId]);

  const loadResumeIndex = useCallback((): number | null => {
    const key = getStorageKey();
    if (key) {
      try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
          const data = JSON.parse(savedData);
          if (data && typeof data.index === 'number') {
            if (currentPageText && data.index >= currentPageText.length) {
                 console.warn(`%c[${readerInstanceId}][TTS Resume Load] Page ${currentPageDisplay}: Loaded index ${data.index} out of bounds. Clearing.`, "color: orange;");
                 localStorage.removeItem(key); return null;
            }
            console.log(`%c[${readerInstanceId}][TTS Resume Load] Page ${currentPageDisplay}: Loaded Index ${data.index} for key ${key}`, "color: green;");
            return data.index;
          }
        }
      } catch (error) { console.error(`%c[${readerInstanceId}][TTS Resume Load] Page ${currentPageDisplay}: Error loading for key ${key}:`, "color: red;", error); localStorage.removeItem(key); }
    }
    return null;
  }, [currentPageDisplay, getStorageKey, currentPageText, readerInstanceId]);

  const clearResumeIndex = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
        console.log(`%c[${readerInstanceId}][TTS Resume Clear] Page ${currentPageDisplay}: Cleared progress for key ${key}`, "color: purple;");
      } catch (error) { console.error(`%c[${readerInstanceId}][TTS Resume Clear] Page ${currentPageDisplay}: Error clearing for key ${key}:`, "color: red;", error); }
    }
    setResumeIndex(null);
    setHasFinishedPlayback(true);
    currentTTSBaseOffsetRef.current = 0;
  }, [currentPageDisplay, getStorageKey, readerInstanceId]);

  useEffect(() => {
    const logPrefix = `[${readerInstanceId}][Effect LoadResumeIndex] Page ${currentPageDisplay}:`;
    if (bookTitle && currentPageText !== undefined) {
      console.log(`${logPrefix} Loading resume index. Text length: ${currentPageText?.length}`);
      const loadedIndex = loadResumeIndex();
      setResumeIndex(loadedIndex);
      setHasFinishedPlayback(false);
    } else { setResumeIndex(null); }
    currentTTSBaseOffsetRef.current = 0;
    ttsIntentActiveRef.current = false;
    console.log(`${logPrefix} ttsIntentActiveRef.current RESET to false.`);
  }, [currentPageDisplay, bookTitle, currentPageText, loadResumeIndex, readerInstanceId]);

  useEffect(() => {
    let wasOverallServiceActive = ttsService.isSessionActive() || ttsService.isCurrentlyPlaying() || ttsService.isCurrentlyPaused() || ttsService.isCurrentlyProcessing();
    const pollerId = `[${readerInstanceId}][TTS Poller Page ${currentPageDisplay}]`;
    const checkStatus = () => {
      const servicePlaying = ttsService.isCurrentlyPlaying();
      const servicePaused = ttsService.isCurrentlyPaused();
      const serviceProcessing = ttsService.isCurrentlyProcessing();
      const serviceSessionActive = ttsService.isSessionActive();
      if (isSpeaking !== servicePlaying) setIsSpeaking(servicePlaying);
      if (isPaused !== servicePaused) setIsPaused(servicePaused);
      const readerShouldBeProcessing = serviceProcessing && !servicePlaying && !servicePaused;
      if (isProcessing !== readerShouldBeProcessing) setIsProcessing(readerShouldBeProcessing);
      const currentOverallServiceActive = servicePlaying || servicePaused || serviceSessionActive || serviceProcessing;
      if (wasOverallServiceActive && !currentOverallServiceActive && !isPaused) {
        console.log(`${pollerId} Playback session FINISHED/STOPPED (not user paused).`);
        setHasFinishedPlayback(true); clearResumeIndex(); ttsIntentActiveRef.current = false; }
      wasOverallServiceActive = currentOverallServiceActive;
    };
    checkStatus(); const intervalId = setInterval(checkStatus, 300);
    return () => clearInterval(intervalId);
  }, [currentPageDisplay, clearResumeIndex, isSpeaking, isPaused, isProcessing, readerInstanceId]);

  const saveCurrentTTSProgress = useCallback(() => {
    const logPrefix = `[${readerInstanceId}][saveCurrentTTSProgress Page ${currentPageDisplay}]`;
    if (ttsIntentActiveRef.current && (ttsService.isSessionActive() || isSpeaking || isPaused)) {
      const charOffsetOfChunkStart = ttsService.getCurrentPlaybackStartIndex();
      console.log(`${logPrefix} Service.getCurrentPlaybackStartIndex: ${charOffsetOfChunkStart}`);
      if (charOffsetOfChunkStart >= 0) {
        const absoluteIndexOnPage = currentTTSBaseOffsetRef.current + charOffsetOfChunkStart;
        console.log(`${logPrefix} Saving absoluteIndexOnPage: ${absoluteIndexOnPage}`);
        saveResumeIndex(absoluteIndexOnPage);
        setHasFinishedPlayback(false);
      } else { console.warn(`${logPrefix} Invalid index from TTS service: ${charOffsetOfChunkStart}. Not saving.`); }
    } else { console.log(`${logPrefix} No active TTS intent or service not active/paused. No progress to save.`); }
  }, [saveResumeIndex, currentPageDisplay, readerInstanceId, isSpeaking, isPaused]);


  // ++++++++++ CRITICALLY MODIFIED Cleanup useEffect ++++++++++
  useEffect(() => {
    const logPrefix = `[${readerInstanceId}][Reader Main Cleanup Effect] Setup for Page ${currentPageDisplay}, Book: ${bookTitle || "None"}`;
    console.log(logPrefix);

    // Capture values at the time of effect setup FOR THIS RENDER CYCLE
    const pageAtThisEffectInstance = currentPageDisplay;
    const bookTitleAtThisEffectInstance = bookTitle;
    const ttsIntentWasActiveForThisInstance = ttsIntentActiveRef.current; // Capture the intent status FOR THIS RENDER

    return () => {
      const cleanupLogPrefix = `[${readerInstanceId}][Reader Main Cleanup] Run for (Effect Instance Context: Page ${pageAtThisEffectInstance}, Book: ${bookTitleAtThisEffectInstance}, Intent: ${ttsIntentWasActiveForThisInstance})`;
      console.log(`${cleanupLogPrefix}. Current Actual Page: ${currentPageDisplay}, Current Actual Book: ${bookTitle || "None"}`);
      console.log(`${cleanupLogPrefix} Service Active: ${ttsService.isSessionActive()}, Service Paused: ${ttsService.isCurrentlyPaused()}`);

      // This cleanup runs when the component unmounts OR when currentPageDisplay/bookTitle changes.
      // We only want to stop audio if an intent was active FOR THE CONTEXT THIS EFFECT WAS FOR.
      if (ttsIntentWasActiveForThisInstance && (ttsService.isSessionActive() || ttsService.isCurrentlyPaused())) {
        // Check if the actual context has changed from what this effect instance was tracking.
        // This helps differentiate a true navigation/unmount from a simple re-render on the same page.
        // However, the dependencies already handle the "context change".
        // The main purpose now is to stop audio if an intent was active upon unmount/context change.
        console.log(`${cleanupLogPrefix} An active TTS intent existed for the departing context. Stopping audio.`);
        ttsService.stopAudio();
        // No need to save progress here, navigation handlers should do that *before* changing page/book.
      } else {
        console.log(`${cleanupLogPrefix} No stop action needed by this cleanup (no active intent for its context or service already idle).`);
      }
    };
  }, [currentPageDisplay, bookTitle, readerInstanceId]); // <<<< MINIMAL DEPENDENCIES: Only for context change or unmount
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


  const handleTTS = useCallback(async () => {
    const logPrefix = `[${readerInstanceId}][handleTTS EXECUTE Page ${currentPageDisplay}]`;
    console.log(`${logPrefix} Entry. isProcessing: ${isProcessing}, isPaused: ${isPaused}, isSpeaking: ${isSpeaking}, resumeIndex: ${resumeIndex}, hasFinishedPlayback: ${hasFinishedPlayback}, text exists: ${!!currentPageText}`);

    if (!currentPageText) {
        console.warn(`${logPrefix} TTS not ready (no currentPageText). Aborting.`);
        return;
    }
    if (isProcessing && !isSpeaking && !isPaused) {
      console.log(`${logPrefix} TTS is currently processing initial audio. Ignoring duplicate 'Read'/'Resume' action.`);
      return;
    }

    // --- Set TTS Intent Active ---
    console.log(`${logPrefix} Setting ttsIntentActiveRef.current = true.`);
    ttsIntentActiveRef.current = true;

    if (isPaused) {
      console.log(`${logPrefix} Attempting to RESUME from PAUSED state.`);
      ttsService.resumeAudio(); return;
    }
    if (isSpeaking) {
      console.log(`${logPrefix} Attempting to PAUSE currently speaking audio.`);
      saveCurrentTTSProgress(); ttsService.pauseAudio(); return;
    }

    console.log(`${logPrefix} Attempting to START new or character-resumed playback.`);
    let textToSpeak = currentPageText; let speakFromOffset = 0;
    if (resumeIndex !== null && resumeIndex >= 0 && !hasFinishedPlayback) {
      if (resumeIndex < currentPageText.length) {
        console.log(`${logPrefix} Using TTS resumeIndex: ${resumeIndex}.`);
        speakFromOffset = resumeIndex;
      } else {
        console.warn(`${logPrefix} resumeIndex ${resumeIndex} out of bounds. Reading page from start.`);
        clearResumeIndex(); }
    } else {
      const selection = window.getSelection(); const selectedText = selection?.toString().trim();
      if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
        const startIndexInPage = currentPageText.indexOf(selectedText);
        if (startIndexInPage !== -1) {
          console.log(`${logPrefix} User selected text. Index ${startIndexInPage}.`);
          speakFromOffset = startIndexInPage; clearResumeIndex();
        } else { console.warn(`${logPrefix} Could not match selection. Reading page from start.`); clearResumeIndex(); }
      } else { console.log(`${logPrefix} No resumeIndex/selection. Reading page from beginning.`); clearResumeIndex(); }
    }
    textToSpeak = currentPageText.substring(speakFromOffset);
    currentTTSBaseOffsetRef.current = speakFromOffset;

    if (!textToSpeak.trim()) {
      console.warn(`${logPrefix} No text to speak after offset ${speakFromOffset}).`);
      if (speakFromOffset > 0 && speakFromOffset >= currentPageText.length -1) {
        setHasFinishedPlayback(true); clearResumeIndex(); }
      ttsIntentActiveRef.current = false; // Reset intent: no speak call made
      return;
    }
    console.log(`${logPrefix} Final speakFromOffset: ${currentTTSBaseOffsetRef.current}, text sample: "${textToSpeak.substring(0, 70)}..."`);
    setHasFinishedPlayback(false);
    try {
      console.log(`${logPrefix} Setting component state isProcessing=true.`);
      setIsProcessing(true); // Let UI know we are starting
      await ttsService.speakTextInChunks(textToSpeak, {
        voice: 'en-US-BrianMultilingualNeural', format: 'audio-24khz-48kbitrate-mono-mp3',
        rate: 1.0, pitch: '+0Hz'
      });
      console.log(`${logPrefix} ttsService.speakTextInChunks call made and awaited (doesn't mean finished playing).`);
    } catch (error) {
      console.error(`${logPrefix} TTS Error during speakTextInChunks:`, error);
      ttsService.stopAudio(); // Ensure service is stopped
      setIsSpeaking(false); setIsPaused(false); setIsProcessing(false); // Reset reader states
      currentTTSBaseOffsetRef.current = 0; ttsIntentActiveRef.current = false; // Reset intent
    }
    // isProcessing will be set to false by the poller when TTS actually starts playing or definitively stops processing.
  }, [
    currentPageDisplay, currentPageText, isProcessing, isPaused, isSpeaking,
    resumeIndex, hasFinishedPlayback, saveCurrentTTSProgress, clearResumeIndex, readerInstanceId
  ]);

  const handleStopTTS = useCallback(() => {
    const logPrefix = `[${readerInstanceId}][handleStopTTS Page ${currentPageDisplay}]`;
    console.log(`${logPrefix} User clicked STOP.`);
    ttsIntentActiveRef.current = false; // Explicitly signal user wants to stop this intent
    ttsService.stopAudio();
    clearResumeIndex(); // Also clears resumeIndex state and sets hasFinishedPlayback
  }, [clearResumeIndex, currentPageDisplay, readerInstanceId]);

  const commonTTSStopAndSaveLogic = useCallback(() => {
    const logPrefix = `[${readerInstanceId}][commonTTSStopAndSave Page ${currentPageDisplay}]`;
    if (ttsIntentActiveRef.current && (ttsService.isSessionActive() || isSpeaking || isPaused)) {
      console.log(`${logPrefix} Active TTS intent and service/reader state. Saving progress and stopping.`);
      saveCurrentTTSProgress();
      ttsService.stopAudio();
    } else if (ttsService.isSessionActive() || ttsService.isCurrentlyProcessing() || isSpeaking || isPaused) { // Check service processing too
        console.log(`${logPrefix} No active user TTS intent for THIS PAGE (ttsIntentActiveRef is false), but service is/was active. Just stopping service.`);
        ttsService.stopAudio();
    } else { console.log(`${logPrefix} No active TTS intent or session. No action.`); }
    ttsIntentActiveRef.current = false; // Always reset intent on navigation/close
  }, [saveCurrentTTSProgress, currentPageDisplay, readerInstanceId, isSpeaking, isPaused]);

  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    console.log(`[${readerInstanceId}][NavToTOC Page ${currentPageDisplay}] Target: ${item.label}`);
    commonTTSStopAndSaveLogic();
    navigateToTocItem(item);
  }, [navigateToTocItem, commonTTSStopAndSaveLogic, readerInstanceId, currentPageDisplay]);

  const handlePrevPage = useCallback(() => {
    console.log(`[${readerInstanceId}][PrevPage Page ${currentPageDisplay}]`);
    commonTTSStopAndSaveLogic();
    prevPage();
  }, [prevPage, commonTTSStopAndSaveLogic, readerInstanceId, currentPageDisplay]);

  const handleNextPage = useCallback(() => {
    console.log(`[${readerInstanceId}][NextPage Page ${currentPageDisplay}]`);
    commonTTSStopAndSaveLogic();
    nextPage();
  }, [nextPage, commonTTSStopAndSaveLogic, readerInstanceId, currentPageDisplay]);

  const handleCloseBookCB = useCallback(() => {
    console.log(`[${readerInstanceId}][CloseBook Page ${currentPageDisplay}]`);
    commonTTSStopAndSaveLogic();
    closeBook();
  }, [closeBook, commonTTSStopAndSaveLogic, readerInstanceId, currentPageDisplay]);

  const canTTSResume = !!currentPageText && resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback;

  return (
    // ... JSX is the same as your last provided version ...
    // Ensure Controls receives onStopTTS={handleStopTTS}
    <div className="reader">
      <header className="reader-header">
        <div className="reader-left">
          <button onClick={handleCloseBookCB} className="back-button"> ← Back to Library </button>
        </div>
        <div className="reader-center">
          <h2 className="book-title">{bookTitle}</h2>
          <p className="book-author">{bookAuthor}</p>
        </div>
        <div className="reader-right">
          <div className="controls-container">
            <Controls
              currentPage={currentPageDisplay} totalPages={totalPages}
              onPrevious={handlePrevPage} onNext={handleNextPage}
              onReadAloud={handleTTS} onStopTTS={handleStopTTS}
              isReading={isSpeaking} isPaused={isPaused}
              isProcessing={isProcessing && !(isSpeaking || isPaused)}
              canResume={canTTSResume}
              onAudiobook={togglePlayMode} isPlayModeActive={isPlayModeVisible}
              isReadButtonActive={isSpeaking || isPaused || canTTSResume}
            />
          </div>
        </div>
      </header>

      <div className="reader-container">
        {((isLoading && !currentContent && !isPlayModeVisible) || (isProcessing && !isSpeaking && !isPaused && !isPlayModeVisible)) ? (
          <div className="loading-overlay"> <div className="loading-spinner"></div>
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
          <SearchBar />
          <div className="epub-content" dangerouslySetInnerHTML={{ __html: currentContent }}></div>
        </div>
        {isPlayModeVisible && (
          useKokoroTTS ? ( <KokoroPlayMode currentPageContent={currentPageText} onClose={togglePlayMode} /> )
                       : ( <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} /> )
        )}
      </div>
      {showFeatureHighlight && ( <FeatureHighlight onClose={() => setShowFeatureHighlight(false)} /> )}
    </div>
  );
};

export default Reader;