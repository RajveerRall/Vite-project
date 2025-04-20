// // // // // src/components/Reader/index.tsx
// // // // import React, { useState, useEffect } from 'react';
// // // // import { useBook } from '../../context/BookContext';
// // // // import { TTSService } from '../../services/msedge';
// // // // import SimplePlayMode from './SimplePlayMode';
// // // // import KokoroPlayMode from './SimplePlayMode';
// // // // import TableOfContents from '../Library/TableOfContents';
// // // // import SearchBar from '../Library/SearchBar';
// // // // import Controls from './Controls';
// // // // import './Reader.css';

// // // // const Reader: React.FC = () => {
// // // //   const { 
// // // //     bookTitle, 
// // // //     bookAuthor, 
// // // //     currentPage, 
// // // //     totalPages,
// // // //     currentContent, 
// // // //     toc, 
// // // //     closeBook,
// // // //     nextPage,
// // // //     prevPage,
// // // //     navigateToTocItem,
// // // //     isPlayModeVisible,
// // // //     togglePlayMode,
// // // //     currentPageText,
// // // //     isLoading
// // // //   } = useBook();
  
// // // //   // State to select TTS mode
// // // //   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
// // // //   const [isSpeaking, setIsSpeaking] = useState(false);
// // // //   const [isProcessing, setIsProcessing] = useState(false);
  
// // // //   // Get the TTS service instance
// // // //   const ttsService = TTSService.getInstance();

// // // //   // Update speaking state based on TTS service
// // // //   useEffect(() => {
// // // //     const checkSpeakingStatus = () => {
// // // //       setIsSpeaking(ttsService.isCurrentlyPlaying());
// // // //       setIsProcessing(ttsService.isCurrentlyProcessing() && !ttsService.isCurrentlyPlaying());
// // // //     };
    
// // // //     // Check every second while TTS is active
// // // //     const intervalId = setInterval(checkSpeakingStatus, 1000);
    
// // // //     // Initial check
// // // //     checkSpeakingStatus();
    
// // // //     return () => {
// // // //       clearInterval(intervalId);
// // // //     };
// // // //   }, []);

// // // //   // Clean up audio when component unmounts or page changes
// // // //   useEffect(() => {
// // // //     return () => {
// // // //       if (ttsService.isCurrentlyPlaying()) {
// // // //         ttsService.stopAudio();
// // // //         setIsSpeaking(false);
// // // //         setIsProcessing(false);
// // // //       }
// // // //     };
// // // //   }, [currentPage]);

// // // //   const handleTTS = async () => {
// // // //     if (isSpeaking) {
// // // //       // Stop the audio if currently speaking
// // // //       ttsService.stopAudio();
// // // //       setIsSpeaking(false);
// // // //       setIsProcessing(false);
// // // //       return;
// // // //     }

// // // //     try {
// // // //       // Set processing state to show loading indicator
// // // //       setIsProcessing(true);
      
// // // //       // Use the chunked TTS method
// // // //       await ttsService.speakTextInChunks(currentPageText, {
// // // //         voice: 'en-US-BrianMultilingualNeural',
// // // //         format: 'audio-24khz-48kbitrate-mono-mp3',
// // // //         rate: 1.0,
// // // //         pitch: '+0Hz'
// // // //       });
      
// // // //       // Speaking state will be updated by the interval in useEffect
// // // //     } catch (error) {
// // // //       console.error('TTS Error:', error);
// // // //       setIsSpeaking(false);
// // // //       setIsProcessing(false);
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="reader">
// // // //       <header className="reader-header">
// // // //         <div className="reader-left">
// // // //           <button onClick={closeBook} className="back-button">
// // // //             ← Back to Library
// // // //           </button>
// // // //         </div>
        
// // // //         <div className="reader-center">
// // // //           <h2 className="book-title">{bookTitle}</h2>
// // // //           <p className="book-author">{bookAuthor}</p>
// // // //         </div>
        
// // // //         <div className="reader-right">
// // // //           <div className="controls-container">
// // // //             <Controls 
// // // //               currentPage={currentPage}
// // // //               totalPages={totalPages}
// // // //               onPrevious={prevPage}
// // // //               onNext={nextPage}
// // // //               onReadAloud={handleTTS}
// // // //               isReading={isSpeaking}
// // // //               onAudiobook={togglePlayMode}
// // // //               isPlayModeActive={isPlayModeVisible}
// // // //             />
// // // //           </div>
// // // //         </div>
// // // //       </header>
      
// // // //       <div className="reader-container">
// // // //         {(isLoading || isProcessing) && (
// // // //           <div className="loading-overlay">
// // // //             <div className="loading-spinner"></div>
// // // //             <p>{isProcessing ? 'Preparing audio...' : 'Loading book...'}</p>
// // // //           </div>
// // // //         )}
        
// // // //         <div className="reader-sidebar">
// // // //           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
// // // //         </div>
        
// // // //         <div className="reader-main">
// // // //           <SearchBar />
          
// // // //           <div 
// // // //             className="epub-content" 
// // // //             dangerouslySetInnerHTML={{ __html: currentContent }}
// // // //           ></div>
// // // //         </div>

// // // //         {isPlayModeVisible && (
// // // //           useKokoroTTS ? (
// // // //             <KokoroPlayMode
// // // //               currentPageContent={currentPageText}
// // // //               onClose={() => togglePlayMode()}
// // // //             />
// // // //           ) : (
// // // //             <SimplePlayMode
// // // //               currentPageContent={currentPageText}
// // // //               onClose={() => togglePlayMode()}
// // // //             />
// // // //           )
// // // //         )}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Reader;


// // // // src/components/Reader/index.tsx
// // // import React, { useState, useEffect } from 'react';
// // // import { useBook } from '../../context/BookContext';
// // // import { TTSService } from '../../services/msedge'; // Make sure methods like pauseAudio, resumeAudio, isCurrentlyPaused exist here
// // // import SimplePlayMode from './SimplePlayMode';
// // // import KokoroPlayMode from './SimplePlayMode';
// // // import TableOfContents from '../Library/TableOfContents';
// // // import SearchBar from '../Library/SearchBar';
// // // import Controls from './Controls';
// // // import './Reader.css';

// // // const Reader: React.FC = () => {
// // //   const {
// // //     bookTitle,
// // //     bookAuthor,
// // //     currentPage,
// // //     totalPages,
// // //     currentContent,
// // //     toc,
// // //     closeBook,
// // //     nextPage,
// // //     prevPage,
// // //     navigateToTocItem,
// // //     isPlayModeVisible,
// // //     togglePlayMode,
// // //     currentPageText,
// // //     isLoading
// // //   } = useBook();

// // //   // State to select TTS mode (Unchanged)
// // //   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);

// // //   // --- Existing State ---
// // //   const [isSpeaking, setIsSpeaking] = useState(false); // True when audio is actively playing
// // //   const [isProcessing, setIsProcessing] = useState(false); // True when fetching/preparing audio

// // //   // --- Added State ---
// // //   const [isPaused, setIsPaused] = useState(false); // True when playback is paused

// // //   // Get the TTS service instance (Unchanged)
// // //   const ttsService = TTSService.getInstance();

// // //   // Update speaking/paused state based on TTS service
// // //   useEffect(() => {
// // //     const checkStatus = () => {
// // //       // Get status from service
// // //       const currentlyPlaying = ttsService.isCurrentlyPlaying(); // Should return true only if playing (not paused)
// // //       const currentlyPaused = ttsService.isCurrentlyPaused();   // Should return true if paused
// // //       const currentlyProcessing = ttsService.isCurrentlyProcessing();
// // //       const sessionActive = ttsService.isSessionActive(); // Helper to know if paused OR playing

// // //       // Update component state
// // //       setIsSpeaking(currentlyPlaying);
// // //       setIsPaused(currentlyPaused);
// // //       // Only show processing if not already playing or paused
// // //       setIsProcessing(currentlyProcessing && !sessionActive);
// // //     };

// // //     // Check every second (Original interval)
// // //     const intervalId = setInterval(checkStatus, 1000);

// // //     // Initial check (Unchanged)
// // //     checkStatus();

// // //     // Cleanup (Unchanged)
// // //     return () => {
// // //       clearInterval(intervalId);
// // //     };
// // //     // Note: No dependencies needed if ttsService is a stable singleton instance
// // //   }, []);

// // //   // Clean up audio when component unmounts or page changes
// // //   useEffect(() => {
// // //     return () => {
// // //       // Check if the session is active (playing or paused) before stopping
// // //       if (ttsService.isSessionActive()) { // Use isSessionActive which includes paused state
// // //         console.log("Reader cleanup: Stopping active TTS session.");
// // //         ttsService.stopAudio();
// // //         // Reset local state for consistency on remount/page change
// // //         setIsSpeaking(false);
// // //         setIsPaused(false);
// // //         setIsProcessing(false);
// // //       }
// // //     };
// // //   }, [currentPage]); // Dependency remains currentPage

// // //   // --- Modified handleTTS for Pause/Resume ---
// // //   const handleTTS = async () => {
// // //     // --- Pause/Resume Logic ---
// // //     if (isPaused) {
// // //       console.log("Reader: Resuming audio");
// // //       ttsService.resumeAudio(); // Call resume method from TTSService
// // //       // Let the useEffect interval update the state naturally
// // //       return;
// // //     }
// // //     if (isSpeaking) {
// // //       console.log("Reader: Pausing audio");
// // //       ttsService.pauseAudio(); // Call pause method from TTSService
// // //       // Let the useEffect interval update the state naturally
// // //       return;
// // //     }

// // //     // --- Original Start Logic (if not speaking or paused) ---
// // //     if (!isProcessing && currentPageText) { // Prevent starting if already processing
// // //       console.log("Reader: Starting new playback");
// // //       try {
// // //         setIsProcessing(true); // Show processing indicator
// // //         setIsSpeaking(false);  // Ensure these are false while processing
// // //         setIsPaused(false);

// // //         await ttsService.speakTextInChunks(currentPageText, {
// // //           voice: 'en-US-BrianMultilingualNeural',
// // //           format: 'audio-24khz-48kbitrate-mono-mp3',
// // //           rate: 1.0,
// // //           pitch: '+0Hz'
// // //         });
// // //         // Speaking/Paused state will be updated by the interval useEffect once playback starts
// // //       } catch (error) {
// // //         console.error('TTS Error starting playback:', error);
// // //         ttsService.stopAudio(); // Ensure service is stopped on error
// // //         setIsSpeaking(false);
// // //         setIsPaused(false);
// // //         setIsProcessing(false); // Reset processing on error
// // //       }
// // //     } else if (!currentPageText) {
// // //         console.warn("Reader: Cannot start TTS, currentPageText is empty.");
// // //     } else {
// // //         console.log("Reader: Already processing TTS, ignoring request.");
// // //     }
// // //   };

// // //   return (
// // //     <div className="reader">
// // //       <header className="reader-header">
// // //         <div className="reader-left">
// // //           <button onClick={closeBook} className="back-button">
// // //             ← Back to Library
// // //           </button>
// // //         </div>

// // //         <div className="reader-center">
// // //           <h2 className="book-title">{bookTitle}</h2>
// // //           <p className="book-author">{bookAuthor}</p>
// // //         </div>

// // //         <div className="reader-right">
// // //           <div className="controls-container">
// // //             {/* --- Pass down necessary states to Controls --- */}
// // //             <Controls
// // //               currentPage={currentPage}
// // //               totalPages={totalPages}
// // //               onPrevious={prevPage}
// // //               onNext={nextPage}
// // //               onReadAloud={handleTTS} // Single handler for Read/Pause/Resume
// // //               isReading={isSpeaking}  // Propagate speaking state
// // //               isPaused={isPaused}    // Propagate paused state
// // //               isProcessing={isProcessing} // Propagate processing state
// // //               onAudiobook={togglePlayMode}
// // //               isPlayModeActive={isPlayModeVisible}
// // //             />
// // //           </div>
// // //         </div>
// // //       </header>

// // //       <div className="reader-container">
// // //         {/* --- Updated loading overlay condition --- */}
// // //         {(isLoading || isProcessing) && (
// // //           <div className="loading-overlay">
// // //             <div className="loading-spinner"></div>
// // //             <p>{isLoading ? 'Loading book...' : isProcessing ? 'Preparing audio...' : 'Loading...'}</p>
// // //           </div>
// // //         )}

// // //         <div className="reader-sidebar">
// // //           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
// // //         </div>

// // //         <div className="reader-main">
// // //           <SearchBar /> {/* Assume SearchBar is implemented */}
// // //           <div
// // //             className="epub-content"
// // //             dangerouslySetInnerHTML={{ __html: currentContent }}
// // //           ></div>
// // //         </div>

// // //         {/* --- Play modes (Unchanged) --- */}
// // //         {isPlayModeVisible && (
// // //           useKokoroTTS ? (
// // //             <KokoroPlayMode
// // //               currentPageContent={currentPageText}
// // //               onClose={togglePlayMode}
// // //             />
// // //           ) : (
// // //             <SimplePlayMode
// // //               currentPageContent={currentPageText}
// // //               onClose={togglePlayMode}
// // //             />
// // //           )
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Reader;


// // // src/components/Reader/index.tsx
// // import React, { useState, useEffect } from 'react';
// // import { useBook } from '../../context/BookContext';
// // import { TTSService } from '../../services/msedge'; // Make sure methods like pauseAudio, resumeAudio, isCurrentlyPaused etc. exist here
// // import SimplePlayMode from './SimplePlayMode';
// // import KokoroPlayMode from './SimplePlayMode';
// // import TableOfContents from '../Library/TableOfContents';
// // import SearchBar from '../Library/SearchBar';
// // import Controls from './Controls';
// // import './Reader.css';

// // // Get the TTS service instance (Singleton)
// // const ttsService = TTSService.getInstance();

// // const Reader: React.FC = () => {
// //   const {
// //     bookTitle,
// //     bookAuthor,
// //     currentPage,
// //     totalPages,
// //     currentContent,
// //     toc,
// //     closeBook,
// //     nextPage,
// //     prevPage,
// //     navigateToTocItem,
// //     isPlayModeVisible,
// //     togglePlayMode,
// //     currentPageText, // The full plain text of the current page
// //     isLoading
// //   } = useBook();

// //   // State to select TTS mode (Unchanged)
// //   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);

// //   // TTS State (Unchanged)
// //   const [isSpeaking, setIsSpeaking] = useState(false);
// //   const [isProcessing, setIsProcessing] = useState(false);
// //   const [isPaused, setIsPaused] = useState(false);

// //   // --- State Update useEffect (Unchanged) ---
// //   useEffect(() => {
// //     const checkStatus = () => {
// //       const currentlyPlaying = ttsService.isCurrentlyPlaying();
// //       const currentlyPaused = ttsService.isCurrentlyPaused();
// //       const currentlyProcessing = ttsService.isCurrentlyProcessing();
// //       const sessionActive = ttsService.isSessionActive();
// //       setIsSpeaking(currentlyPlaying);
// //       setIsPaused(currentlyPaused);
// //       setIsProcessing(currentlyProcessing && !sessionActive);
// //     };
// //     checkStatus();
// //     const intervalId = setInterval(checkStatus, 1000);
// //     return () => clearInterval(intervalId);
// //   }, []);

// //   // --- Cleanup useEffect (Unchanged) ---
// //   useEffect(() => {
// //     return () => {
// //       if (ttsService.isSessionActive()) {
// //         console.log("Reader cleanup: Stopping active TTS session.");
// //         ttsService.stopAudio();
// //         setIsSpeaking(false);
// //         setIsPaused(false);
// //         setIsProcessing(false);
// //       }
// //     };
// //   }, [currentPage]);

// //   // --- Modified handleTTS for Pause/Resume AND Selection ---
// //   const handleTTS = async () => {
// //     // --- 1. Handle Pause/Resume First ---
// //     if (isPaused) {
// //       console.log("Reader: Resuming audio");
// //       ttsService.resumeAudio();
// //       return; // Action handled, exit
// //     }
// //     if (isSpeaking) {
// //       console.log("Reader: Pausing audio");
// //       ttsService.pauseAudio();
// //       return; // Action handled, exit
// //     }

// //     // --- 2. Handle Starting New Playback (If not paused, speaking, or processing) ---
// //     if (!isProcessing && currentPageText) {
// //       let textToSpeak = currentPageText; // Default: read full page

// //       // --- Check for User Selection ---
// //       const selection = window.getSelection();
// //       const selectedText = selection?.toString().trim();

// //       // Check if there's selected text AND if the selection originated within the epub content area
// //       if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
// //           console.log(`Reader: User selected text: "${selectedText.substring(0, 50)}..."`);
// //           // Find where the selection starts within the full plain text
// //           const startIndex = currentPageText.indexOf(selectedText);

// //           if (startIndex !== -1) {
// //               // If found, adjust the text to speak to start from the selection
// //               console.log(`Reader: Found selected text starting at index ${startIndex}. Reading from selection.`);
// //               textToSpeak = currentPageText.substring(startIndex);
// //           } else {
// //               // If selected text couldn't be matched (e.g., due to formatting differences), log a warning and read full page
// //               console.warn(`Reader: Could not precisely locate selected text within currentPageText. Reading full page instead.`);
// //           }
// //       } else {
// //            // If no text selected or selection outside content, log intention to read full page
// //            console.log("Reader: No valid text selected in content area. Reading full page.");
// //       }
// //       // --- End of Selection Check ---

// //       console.log(`Reader: Attempting to speak text (first 100 chars): "${textToSpeak.substring(0, 100)}..."`);
// //       try {
// //         setIsProcessing(true); // Set processing true before async call
// //         setIsSpeaking(false);
// //         setIsPaused(false);

// //         // Use the determined text (full page or from selection)
// //         await ttsService.speakTextInChunks(textToSpeak, {
// //           voice: 'en-US-BrianMultilingualNeural',
// //           format: 'audio-24khz-48kbitrate-mono-mp3',
// //           rate: 1.0,
// //           pitch: '+0Hz'
// //         });
// //         // Let the useEffect interval update isSpeaking/isPaused once playback actually starts
// //       } catch (error) {
// //         console.error('TTS Error starting playback:', error);
// //         ttsService.stopAudio(); // Ensure service is stopped on error
// //         setIsSpeaking(false);
// //         setIsPaused(false);
// //         setIsProcessing(false); // Reset processing on error
// //       }
// //     } else if (!currentPageText) {
// //         console.warn("Reader: Cannot start TTS, currentPageText is empty.");
// //     } else {
// //         // Log if prevented by processing state
// //         console.log("Reader: Already processing TTS, ignoring request.");
// //     }
// //   }; // End of handleTTS

// //   // --- Return JSX (Ensure .epub-content class exists) ---
// //   return (
// //     <div className="reader">
// //       <header className="reader-header">
// //         <div className="reader-left">
// //           <button onClick={closeBook} className="back-button">
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
// //               onPrevious={prevPage}
// //               onNext={nextPage}
// //               onReadAloud={handleTTS} // Pass the updated handler
// //               isReading={isSpeaking}
// //               isPaused={isPaused}
// //               isProcessing={isProcessing}
// //               onAudiobook={togglePlayMode}
// //               isPlayModeActive={isPlayModeVisible}
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
// //           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
// //         </div>
// //         <div className="reader-main">
// //           <SearchBar />
// //           {/* --- CRITICAL: Ensure this div has the class used in selection check --- */}
// //           <div
// //             className="epub-content" // <--- This class name must match the check in handleTTS
// //             dangerouslySetInnerHTML={{ __html: currentContent }}
// //           ></div>
// //         </div>
// //         {isPlayModeVisible && (
// //         useKokoroTTS ? (
// //           <KokoroPlayMode
// //             currentPageContent={currentPageText} // Pass the text content
// //             onClose={togglePlayMode}           // Pass the close handler
// //           />
// //         ) : (
// //           <SimplePlayMode
// //             currentPageContent={currentPageText} // Pass the text content
// //             onClose={togglePlayMode}           // Pass the close handler
// //           />
// //         )
// //       )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default Reader;



// // src/components/Reader/index.tsx
// import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
// import { useBook } from '../../context/BookContext';
// import { TTSService } from '../../services/msedge';
// import SimplePlayMode from './SimplePlayMode';
// import KokoroPlayMode from './SimplePlayMode';
// import TableOfContents from '../Library/TableOfContents';
// import SearchBar from '../Library/SearchBar';
// import Controls from './Controls';
// import './Reader.css';

// // Get the TTS service instance (Singleton)
// const ttsService = TTSService.getInstance();
// const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';

// const Reader: React.FC = () => {
//   const {
//     bookTitle,
//     bookAuthor,
//     currentPage,
//     totalPages,
//     currentContent,
//     toc,
//     closeBook,
//     nextPage, // Keep original context functions
//     prevPage, // Keep original context functions
//     navigateToTocItem, // Keep original context functions
//     isPlayModeVisible,
//     togglePlayMode,
//     currentPageText,
//     isLoading
//   } = useBook();

//   // --- Component State ---
//   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   // --- NEW: State for Resume Index ---
//   const [resumeIndex, setResumeIndex] = useState<number | null>(null);
//   const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false); // Track if playback completed


//   // --- Storage Helper Functions ---
//   const getStorageKey = useCallback((): string | null => {
//     // Use bookTitle for simplicity, ensure it's a safe key
//     if (!bookTitle) return null;
//     const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize title for key
//     return `${LOCAL_STORAGE_PREFIX}${safeTitle}`;
//   }, [bookTitle]);

//   const saveResumeIndex = useCallback((index: number) => {
//     const key = getStorageKey();
//     if (key && index >= 0) {
//       try {
//         const data = { page: currentPage, index: index };
//         localStorage.setItem(key, JSON.stringify(data));
//         console.log(`Saved progress: Page ${currentPage}, Index ${index} for key ${key}`);
//       } catch (error) {
//         console.error("Error saving progress to localStorage:", error);
//       }
//     }
//   }, [currentPage, getStorageKey]);

//   const loadResumeIndex = useCallback((): number | null => {
//     const key = getStorageKey();
//     if (key) {
//       try {
//         const savedData = localStorage.getItem(key);
//         if (savedData) {
//           const data = JSON.parse(savedData);
//           // Only return index if the saved page matches the current page
//           if (data && typeof data.page === 'number' && data.page === currentPage && typeof data.index === 'number') {
//             console.log(`Loaded progress: Page ${data.page}, Index ${data.index} for key ${key}`);
//             return data.index;
//           } else {
//              // Clear data if page doesn't match
//              localStorage.removeItem(key);
//           }
//         }
//       } catch (error) {
//         console.error("Error loading progress from localStorage:", error);
//         localStorage.removeItem(key); // Clear corrupted data
//       }
//     }
//     return null;
//   }, [currentPage, getStorageKey]);

//   const clearResumeIndex = useCallback(() => {
//     const key = getStorageKey();
//     if (key) {
//       try {
//         localStorage.removeItem(key);
//         console.log(`Cleared progress for key ${key}`);
//       } catch (error) {
//         console.error("Error clearing progress from localStorage:", error);
//       }
//     }
//     setResumeIndex(null); // Also clear component state
//   }, [getStorageKey]);

//   // --- Effect to Load Resume Index on Page/Book Change ---
//   useEffect(() => {
//     if (bookTitle) { // Only load if we have a book title
//       const loadedIndex = loadResumeIndex();
//       setResumeIndex(loadedIndex);
//       setHasFinishedPlayback(false); // Reset finished flag on page change
//     } else {
//       setResumeIndex(null); // Clear if no book title
//     }
//     // Make sure TTS stops when page changes IF it was playing
//     // The cleanup effect below handles this already
//   }, [currentPage, bookTitle, loadResumeIndex]); // Rerun when page or book changes


//   // --- Effect to Update Component State from Service ---
//   useEffect(() => {
//     let wasSpeakingLastCheck = false; // Track previous state to detect stopping

//     const checkStatus = () => {
//       const currentlyPlaying = ttsService.isCurrentlyPlaying();
//       const currentlyPaused = ttsService.isCurrentlyPaused();
//       const currentlyProcessing = ttsService.isCurrentlyProcessing();
//       const sessionActive = ttsService.isSessionActive();

//       setIsSpeaking(currentlyPlaying);
//       setIsPaused(currentlyPaused);
//       setIsProcessing(currentlyProcessing && !sessionActive);

//       // --- NEW: Detect when playback naturally finishes ---
//       if (wasSpeakingLastCheck && !sessionActive && !currentlyProcessing) {
//         console.log("Playback session appears to have finished naturally.");
//         setHasFinishedPlayback(true); // Set flag
//         clearResumeIndex(); // Clear saved progress on natural completion
//       }
//       wasSpeakingLastCheck = sessionActive; // Update tracker for next check
//       // --- End New ---
//     };

//     checkStatus();
//     const intervalId = setInterval(checkStatus, 500); // Check more frequently
//     return () => clearInterval(intervalId);
//     // Pass clearResumeIndex as dependency if using it inside effect directly
//   }, [clearResumeIndex]);


//   // --- NEW: Function to Save Current Progress ---
//   const saveCurrentProgress = useCallback(() => {
//     if (ttsService.isSessionActive()) { // Only save if playing or paused
//       const currentIndex = ttsService.getCurrentPlaybackStartIndex();
//       if (currentIndex >= 0) {
//         saveResumeIndex(currentIndex);
//         setHasFinishedPlayback(false); // Reset finished flag when saving progress
//       } else {
//         console.warn("Tried to save progress, but got invalid index:", currentIndex);
//       }
//     } else {
//         // If TTS stopped unexpectedly or naturally before saving, clear progress
//         console.log("TTS not active, clearing potential stale progress.");
//         clearResumeIndex();
//     }
//   }, [ttsService, saveResumeIndex, clearResumeIndex]); // Added ttsService


//   // --- Effect to Save Progress on Unmount/Page Change ---
//   useEffect(() => {
//     // This function runs when the component unmounts OR when currentPage changes
//     // (which happens BEFORE the main load effect for the new page runs)
//     return () => {
//       console.log("Reader cleanup running...");
//       if (ttsService.isSessionActive()) {
//         console.log("Reader cleanup: Saving progress before stopping TTS.");
//         saveCurrentProgress(); // Save progress *before* stopping
//         console.log("Reader cleanup: Stopping active TTS session.");
//         ttsService.stopAudio();
//         // No need to reset local state, component is unmounting or re-rendering fully
//       }
//     };
//   }, [currentPage, saveCurrentProgress]); // Depend on saveCurrentProgress


//   // --- Modified handleTTS for Pause/Resume, Selection, AND Saved Resume ---
//   const handleTTS = useCallback(async () => {
//     // --- 1. Handle Pause/Resume First ---
//     if (isPaused) {
//       console.log("Reader: Resuming audio from paused state.");
//       ttsService.resumeAudio();
//       // Don't save here, save when explicitly paused or stopped
//       return;
//     }
//     if (isSpeaking) {
//       console.log("Reader: Pausing audio.");
//       ttsService.pauseAudio();
//       saveCurrentProgress(); // Save position when pausing
//       return;
//     }

//     // --- 2. Handle Starting New Playback ---
//     if (!isProcessing && currentPageText) {
//       let textToSpeak = currentPageText;
//       let isResumingFromSave = false;

//       // --- Check if we should resume from SAVED position ---
//       // Trigger resume only if TTS is idle and resumeIndex is valid
//       if (resumeIndex !== null && resumeIndex >= 0 && !isSpeaking && !isPaused) {
//           console.log(`Reader: Resuming from saved index: ${resumeIndex}`);
//           textToSpeak = currentPageText.substring(resumeIndex);
//           isResumingFromSave = true;
//           clearResumeIndex(); // Clear saved index *after* deciding to use it
//       }
//       // --- Check for User Selection (only if NOT resuming from save) ---
//       else {
//           const selection = window.getSelection();
//           const selectedText = selection?.toString().trim();
//           if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
//               console.log(`Reader: User selected text: "${selectedText.substring(0, 50)}..."`);
//               const startIndex = currentPageText.indexOf(selectedText);
//               if (startIndex !== -1) {
//                   console.log(`Reader: Found selection at index ${startIndex}. Reading from selection.`);
//                   textToSpeak = currentPageText.substring(startIndex);
//                   clearResumeIndex(); // Clear saved index if starting from selection
//               } else {
//                   console.warn(`Reader: Could not match selection. Reading full page.`);
//                   clearResumeIndex(); // Clear saved index if starting fresh
//               }
//           } else {
//               console.log("Reader: No selection. Reading full page.");
//               clearResumeIndex(); // Clear saved index if starting fresh
//           }
//       }
//       // --- End Selection/Resume Logic ---

//       if (!textToSpeak) {
//           console.warn("Reader: No text determined to speak (possibly empty selection/resume point).");
//           setIsProcessing(false); // Ensure processing resets
//           return;
//       }

//       console.log(`Reader: Attempting to speak text (first 100 chars): "${textToSpeak.substring(0, 100)}..."`);
//       setHasFinishedPlayback(false); // Reset finished flag on new playback start
//       try {
//         setIsProcessing(true);
//         setIsSpeaking(false);
//         setIsPaused(false);

//         await ttsService.speakTextInChunks(textToSpeak, { // Pass the determined text
//           voice: 'en-US-BrianMultilingualNeural',
//           format: 'audio-24khz-48kbitrate-mono-mp3',
//           rate: 1.0,
//           pitch: '+0Hz'
//         });
//         // State updates via interval
//       } catch (error) {
//         console.error('TTS Error starting playback:', error);
//         ttsService.stopAudio(); // Ensure service stops
//         setIsSpeaking(false);
//         setIsPaused(false);
//         setIsProcessing(false);
//         clearResumeIndex(); // Clear any potentially saved index on error
//       }
//     } else if (!currentPageText) {
//         console.warn("Reader: Cannot start TTS, currentPageText is empty.");
//     } else {
//         console.log("Reader: Already processing TTS, ignoring request.");
//     }
//   }, [ isPaused, isSpeaking, isProcessing, currentPageText, resumeIndex, saveCurrentProgress, clearResumeIndex ]);


//   // --- Wrap Navigation functions to save progress ---
//   // NOTE: This assumes nextPage/prevPage/navigateToTocItem eventually update `currentPage`,
//   // which will trigger the cleanup effect to save progress. If navigation is instant
//   // and doesn't cause a state update leading to the cleanup, you might need explicit saves.
//   // For simplicity, we rely on the existing cleanup effect tied to `currentPage`.

//   // --- Wrap Navigation functions ---

//   // --- CORRECTED: handleNavigateToTocItem wrapper ---
//   const handleNavigateToTocItem = useCallback((item: TOCItem) => { // <-- Accepts TOCItem
//     console.log(`Navigating via TOC, current page: ${currentPage}. Saving progress.`);
//     // Save progress *before* navigating
//     if (ttsService.isSessionActive()) {
//         saveCurrentProgress();
//         ttsService.stopAudio(); // Stop audio before navigating chapters
//     }
//     // Call the original function from context with the href
//     navigateToTocItem(item.href);
// }, [navigateToTocItem, currentPage, saveCurrentProgress]); // Add dependencies
// // --- End Correction ---

// const handlePrevPage = useCallback(() => {
//     if (ttsService.isSessionActive()) {
//       saveCurrentProgress(); // Save progress before navigating
//       ttsService.stopAudio();
//     }
//     prevPage();
// }, [prevPage, saveCurrentProgress]);

// const handleNextPage = useCallback(() => {
//     if (ttsService.isSessionActive()) {
//         saveCurrentProgress(); // Save progress before navigating
//         ttsService.stopAudio();
//     }
//     nextPage();
// }, [nextPage, saveCurrentProgress]);

// const handleCloseBook = useCallback(() => {
//       if (ttsService.isSessionActive()) {
//           saveCurrentProgress(); // Save progress before closing
//           ttsService.stopAudio();
//       }
//       closeBook();
// }, [closeBook, saveCurrentProgress]);



//   // --- Return JSX ---
//   return (
//     <div className="reader">
//       <header className="reader-header">
//         <div className="reader-left">
//           {/* Use wrapped close handler */}
//           <button onClick={handleCloseBook} className="back-button">
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
//               currentPage={currentPage}
//               totalPages={totalPages}
//               // Use wrapped navigation handlers
//               onPrevious={handlePrevPage}
//               onNext={handleNextPage}
//               onReadAloud={handleTTS}
//               isReading={isSpeaking}
//               isPaused={isPaused}
//               isProcessing={isProcessing}
//               // --- NEW: Pass resume state ---
//               canResume={resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback} // Only show resume if idle and index exists
//               onAudiobook={togglePlayMode}
//               isPlayModeActive={isPlayModeVisible}
//             />
//           </div>
//         </div>
//       </header>

//       <div className="reader-container">
//         {(isLoading || isProcessing) && (
//           <div className="loading-overlay">
//             <div className="loading-spinner"></div>
//             <p>{isLoading ? 'Loading book...' : isProcessing ? 'Preparing audio...' : 'Loading...'}</p>
//           </div>
//         )}
//         <div className="reader-sidebar">
//            {/* Use wrapped TOC handler */}
//           <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
//         </div>
//         <div className="reader-main">
//           <SearchBar />
//           <div
//             className="epub-content"
//             dangerouslySetInnerHTML={{ __html: currentContent }}
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
//     </div>
//   );
// };

// export default Reader;


// src/components/Reader/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useBook } from '../../context/BookContext';
import { TTSService } from '../../services/msedge';
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
// --- Import TOCItem type ---
import { TOCItem } from '../../types/books'; // Import the type definition
import './Reader.css';

// Get the TTS service instance (Singleton)
const ttsService = TTSService.getInstance();
const LOCAL_STORAGE_PREFIX = 'ebookReaderProgress_';

const Reader: React.FC = () => {
  const {
    bookTitle,
    bookAuthor,
    currentPage,
    totalPages,
    currentContent,
    toc,
    closeBook,
    nextPage, // Keep original context functions
    prevPage, // Keep original context functions
    navigateToTocItem, // Keep original context functions
    isPlayModeVisible,
    togglePlayMode,
    currentPageText,
    isLoading
  } = useBook();

  // --- Component State ---
  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // --- State for Resume Index ---
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [hasFinishedPlayback, setHasFinishedPlayback] = useState<boolean>(false); // Track if playback completed


  // --- Storage Helper Functions ---
  const getStorageKey = useCallback((): string | null => {
    // Use bookTitle for simplicity, ensure it's a safe key
    if (!bookTitle) return null;
    const safeTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize title for key
    return `${LOCAL_STORAGE_PREFIX}${safeTitle}`;
  }, [bookTitle]);

  const saveResumeIndex = useCallback((index: number) => {
    const key = getStorageKey();
    if (key && index >= 0) {
      try {
        const data = { page: currentPage, index: index };
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Saved progress: Page ${currentPage}, Index ${index} for key ${key}`);
      } catch (error) {
        console.error("Error saving progress to localStorage:", error);
      }
    }
  }, [currentPage, getStorageKey]);

  const loadResumeIndex = useCallback((): number | null => {
    const key = getStorageKey();
    if (key) {
      try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
          const data = JSON.parse(savedData);
          // Only return index if the saved page matches the current page
          if (data && typeof data.page === 'number' && data.page === currentPage && typeof data.index === 'number') {
            // --- Add bounds check ---
            if (currentPageText && data.index >= currentPageText.length) {
                 console.warn(`Loaded index ${data.index} is out of bounds for page ${currentPage}. Clearing.`);
                 localStorage.removeItem(key);
                 return null;
            }
            // --- End bounds check ---
            console.log(`Loaded progress: Page ${data.page}, Index ${data.index} for key ${key}`);
            return data.index;
          } else if (data && data.page !== currentPage) {
             // Clear data if page doesn't match
             console.log(`Saved progress page ${data.page} doesn't match current page ${currentPage}. Clearing.`);
             localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error("Error loading progress from localStorage:", error);
        localStorage.removeItem(key); // Clear corrupted data
      }
    }
    return null;
  }, [currentPage, getStorageKey, currentPageText]); // Added currentPageText dependency for bounds check

  const clearResumeIndex = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
        console.log(`Cleared progress for key ${key}`);
      } catch (error) {
        console.error("Error clearing progress from localStorage:", error);
      }
    }
    setResumeIndex(null); // Also clear component state
  }, [getStorageKey]);

  // --- Effect to Load Resume Index on Page/Book Change ---
  useEffect(() => {
    if (bookTitle && currentPageText !== undefined) { // Ensure currentPageText is available for bounds check
      const loadedIndex = loadResumeIndex();
      setResumeIndex(loadedIndex);
      setHasFinishedPlayback(false);
    } else if (!bookTitle) {
      setResumeIndex(null); // Clear if no book title
    }
  }, [currentPage, bookTitle, loadResumeIndex, currentPageText]); // Added currentPageText dependency


  // --- Effect to Update Component State from Service ---
  useEffect(() => {
    let wasActiveLastCheck = false; // Track previous active state

    const checkStatus = () => {
      const currentlyPlaying = ttsService.isCurrentlyPlaying();
      const currentlyPaused = ttsService.isCurrentlyPaused();
      const currentlyProcessing = ttsService.isCurrentlyProcessing();
      const sessionActive = ttsService.isSessionActive();

      setIsSpeaking(currentlyPlaying);
      setIsPaused(currentlyPaused);
      setIsProcessing(currentlyProcessing && !sessionActive);

      // Detect when playback naturally finishes (was active, now isn't, and not just processing)
      if (wasActiveLastCheck && !sessionActive && !currentlyProcessing) {
        console.log("Playback session appears to have finished naturally.");
        setHasFinishedPlayback(true);
        clearResumeIndex(); // Clear saved progress on natural completion
      }
      wasActiveLastCheck = sessionActive; // Update tracker for next check
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, 500);
    return () => clearInterval(intervalId);
  }, [clearResumeIndex]); // Dependency added


  // --- Function to Save Current Progress ---
  const saveCurrentProgress = useCallback(() => {
    if (ttsService.isSessionActive()) {
      const currentIndex = ttsService.getCurrentPlaybackStartIndex();
      if (currentIndex >= 0) {
        saveResumeIndex(currentIndex);
        setHasFinishedPlayback(false);
      } else {
        console.warn("Tried to save progress, but got invalid index:", currentIndex);
        // Don't clear here - might be temporarily invalid during state transitions
      }
    } else {
      // Only clear if we know playback has definitively stopped and wasn't just temporarily inactive
      // The interval effect handles clearing on natural finish.
       // console.log("TTS not active during save attempt.");
    }
  }, [saveResumeIndex]); // Removed clearResumeIndex, ttsService


  // --- Effect to Save Progress on Unmount/Page Change ---
  useEffect(() => {
    return () => {
      if (ttsService.isSessionActive()) {
        console.log("Reader cleanup: Saving progress before stopping TTS.");
        saveCurrentProgress();
        console.log("Reader cleanup: Stopping active TTS session.");
        ttsService.stopAudio();
      }
    };
  }, [currentPage, saveCurrentProgress]);


  // --- Modified handleTTS (Removed unused variable) ---
  const handleTTS = useCallback(async () => {
    // --- 1. Handle Pause/Resume First ---
    if (isPaused) {
      console.log("Reader: Resuming audio from paused state.");
      ttsService.resumeAudio();
      return;
    }
    if (isSpeaking) {
      console.log("Reader: Pausing audio.");
      ttsService.pauseAudio();
      saveCurrentProgress(); // Save position when pausing
      return;
    }

    // --- 2. Handle Starting New Playback ---
    if (!isProcessing && currentPageText) {
      let textToSpeak = currentPageText;

      // --- Check if we should resume from SAVED position ---
      // Trigger resume only if TTS is idle and resumeIndex is valid
      if (resumeIndex !== null && resumeIndex >= 0 && !isSpeaking && !isPaused) {
          console.log(`Reader: Resuming from saved index: ${resumeIndex}`);
          // Ensure resumeIndex is within bounds (already checked in loadResumeIndex now)
          textToSpeak = currentPageText.substring(resumeIndex);
          clearResumeIndex(); // Clear saved index *after* deciding to use it
      }
      // --- Check for User Selection (only if NOT resuming from save) ---
      else {
          const selection = window.getSelection();
          const selectedText = selection?.toString().trim();
          if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
              console.log(`Reader: User selected text: "${selectedText.substring(0, 50)}..."`);
              const startIndex = currentPageText.indexOf(selectedText);
              if (startIndex !== -1) {
                  console.log(`Reader: Found selection at index ${startIndex}. Reading from selection.`);
                  textToSpeak = currentPageText.substring(startIndex);
                  clearResumeIndex(); // Clear saved index if starting from selection
              } else {
                  console.warn(`Reader: Could not match selection. Reading full page.`);
                  clearResumeIndex(); // Clear saved index if starting fresh
              }
          } else {
              // If not resuming and no selection, clear any potentially stale resume index
              if(resumeIndex !== null) {
                 console.log("Reader: No selection and not resuming. Clearing previously loaded resume index.");
                 clearResumeIndex();
              }
              console.log("Reader: Reading full page.");
              // textToSpeak remains currentPageText
          }
      }
      // --- End Selection/Resume Logic ---

      if (!textToSpeak) {
          console.warn("Reader: No text determined to speak (possibly empty selection/resume point).");
          setIsProcessing(false);
          return;
      }

      console.log(`Reader: Attempting to speak text (first 100 chars): "${textToSpeak.substring(0, 100)}..."`);
      setHasFinishedPlayback(false);
      try {
        setIsProcessing(true);
        setIsSpeaking(false);
        setIsPaused(false);

        await ttsService.speakTextInChunks(textToSpeak, {
          voice: 'en-US-BrianMultilingualNeural',
          format: 'audio-24khz-48kbitrate-mono-mp3',
          rate: 1.0,
          pitch: '+0Hz'
        });
      } catch (error) {
        console.error('TTS Error starting playback:', error);
        ttsService.stopAudio();
        setIsSpeaking(false);
        setIsPaused(false);
        setIsProcessing(false);
        clearResumeIndex(); // Also clear resume index on error
      }
    } else if (!currentPageText) {
        console.warn("Reader: Cannot start TTS, currentPageText is empty.");
    } else {
        console.log("Reader: Already processing TTS, ignoring request.");
    }
  }, [ isPaused, isSpeaking, isProcessing, currentPageText, resumeIndex, saveCurrentProgress, clearResumeIndex ]); // Dependencies updated


  // --- Wrap Navigation functions ---
  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
      if (ttsService.isSessionActive()) {
          saveCurrentProgress();
          ttsService.stopAudio();
      }
      navigateToTocItem(item);
  }, [navigateToTocItem, saveCurrentProgress]); // Removed currentPage dependency

  const handlePrevPage = useCallback(() => {
      if (ttsService.isSessionActive()) {
        saveCurrentProgress();
        ttsService.stopAudio();
      }
      prevPage();
  }, [prevPage, saveCurrentProgress]);

  const handleNextPage = useCallback(() => {
      if (ttsService.isSessionActive()) {
          saveCurrentProgress();
          ttsService.stopAudio();
      }
      nextPage();
  }, [nextPage, saveCurrentProgress]);

  const handleCloseBook = useCallback(() => {
        if (ttsService.isSessionActive()) {
            saveCurrentProgress();
            ttsService.stopAudio();
        }
        closeBook();
  }, [closeBook, saveCurrentProgress]);


  // --- Return JSX ---
  return (
    <div className="reader">
      <header className="reader-header">
        <div className="reader-left">
          <button onClick={handleCloseBook} className="back-button">
            ← Back to Library
          </button>
        </div>
        <div className="reader-center">
          <h2 className="book-title">{bookTitle}</h2>
          <p className="book-author">{bookAuthor}</p>
        </div>
        <div className="reader-right">
          <div className="controls-container">
            <Controls
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={handlePrevPage}
              onNext={handleNextPage}
              onReadAloud={handleTTS}
              isReading={isSpeaking}
              isPaused={isPaused}
              isProcessing={isProcessing}
              canResume={resumeIndex !== null && !isSpeaking && !isPaused && !isProcessing && !hasFinishedPlayback}
              onAudiobook={togglePlayMode}
              isPlayModeActive={isPlayModeVisible}
            />
          </div>
        </div>
      </header>

      <div className="reader-container">
        {(isLoading || isProcessing) && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>{isLoading ? 'Loading book...' : isProcessing ? 'Preparing audio...' : 'Loading...'}</p>
          </div>
        )}
        <div className="reader-sidebar">
          <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
        </div>
        <div className="reader-main">
          <SearchBar />
          <div
            className="epub-content"
            dangerouslySetInnerHTML={{ __html: currentContent }}
          ></div>
        </div>
        {isPlayModeVisible && (
          useKokoroTTS ? (
            <KokoroPlayMode
              currentPageContent={currentPageText}
              onClose={togglePlayMode}
            />
          ) : (
            <SimplePlayMode
              currentPageContent={currentPageText}
              onClose={togglePlayMode}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Reader;