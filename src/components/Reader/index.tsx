// // // src/components/Reader/index.tsx
// // import React, { useState, useEffect } from 'react';
// // import { useBook } from '../../context/BookContext';
// // import { TTSService } from '../../services/msedge';
// // import SimplePlayMode from './SimplePlayMode';
// // import KokoroPlayMode from './SimplePlayMode';
// // import TableOfContents from '../Library/TableOfContents';
// // import SearchBar from '../Library/SearchBar';
// // import Controls from './Controls';
// // import './Reader.css';

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
// //     currentPageText,
// //     isLoading
// //   } = useBook();
  
// //   // State to select TTS mode
// //   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
// //   const [isSpeaking, setIsSpeaking] = useState(false);
// //   const [isProcessing, setIsProcessing] = useState(false);
  
// //   // Get the TTS service instance
// //   const ttsService = TTSService.getInstance();

// //   // Update speaking state based on TTS service
// //   useEffect(() => {
// //     const checkSpeakingStatus = () => {
// //       setIsSpeaking(ttsService.isCurrentlyPlaying());
// //       setIsProcessing(ttsService.isCurrentlyProcessing() && !ttsService.isCurrentlyPlaying());
// //     };
    
// //     // Check every second while TTS is active
// //     const intervalId = setInterval(checkSpeakingStatus, 1000);
    
// //     // Initial check
// //     checkSpeakingStatus();
    
// //     return () => {
// //       clearInterval(intervalId);
// //     };
// //   }, []);

// //   // Clean up audio when component unmounts or page changes
// //   useEffect(() => {
// //     return () => {
// //       if (ttsService.isCurrentlyPlaying()) {
// //         ttsService.stopAudio();
// //         setIsSpeaking(false);
// //         setIsProcessing(false);
// //       }
// //     };
// //   }, [currentPage]);

// //   const handleTTS = async () => {
// //     if (isSpeaking) {
// //       // Stop the audio if currently speaking
// //       ttsService.stopAudio();
// //       setIsSpeaking(false);
// //       setIsProcessing(false);
// //       return;
// //     }

// //     try {
// //       // Set processing state to show loading indicator
// //       setIsProcessing(true);
      
// //       // Use the chunked TTS method
// //       await ttsService.speakTextInChunks(currentPageText, {
// //         voice: 'en-US-BrianMultilingualNeural',
// //         format: 'audio-24khz-48kbitrate-mono-mp3',
// //         rate: 1.0,
// //         pitch: '+0Hz'
// //       });
      
// //       // Speaking state will be updated by the interval in useEffect
// //     } catch (error) {
// //       console.error('TTS Error:', error);
// //       setIsSpeaking(false);
// //       setIsProcessing(false);
// //     }
// //   };

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
// //               onReadAloud={handleTTS}
// //               isReading={isSpeaking}
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
// //             <p>{isProcessing ? 'Preparing audio...' : 'Loading book...'}</p>
// //           </div>
// //         )}
        
// //         <div className="reader-sidebar">
// //           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
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
// //               onClose={() => togglePlayMode()}
// //             />
// //           ) : (
// //             <SimplePlayMode
// //               currentPageContent={currentPageText}
// //               onClose={() => togglePlayMode()}
// //             />
// //           )
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default Reader;


// // src/components/Reader/index.tsx
// import React, { useState, useEffect } from 'react';
// import { useBook } from '../../context/BookContext';
// import { TTSService } from '../../services/msedge'; // Make sure methods like pauseAudio, resumeAudio, isCurrentlyPaused exist here
// import SimplePlayMode from './SimplePlayMode';
// import KokoroPlayMode from './SimplePlayMode';
// import TableOfContents from '../Library/TableOfContents';
// import SearchBar from '../Library/SearchBar';
// import Controls from './Controls';
// import './Reader.css';

// const Reader: React.FC = () => {
//   const {
//     bookTitle,
//     bookAuthor,
//     currentPage,
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
//     isLoading
//   } = useBook();

//   // State to select TTS mode (Unchanged)
//   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);

//   // --- Existing State ---
//   const [isSpeaking, setIsSpeaking] = useState(false); // True when audio is actively playing
//   const [isProcessing, setIsProcessing] = useState(false); // True when fetching/preparing audio

//   // --- Added State ---
//   const [isPaused, setIsPaused] = useState(false); // True when playback is paused

//   // Get the TTS service instance (Unchanged)
//   const ttsService = TTSService.getInstance();

//   // Update speaking/paused state based on TTS service
//   useEffect(() => {
//     const checkStatus = () => {
//       // Get status from service
//       const currentlyPlaying = ttsService.isCurrentlyPlaying(); // Should return true only if playing (not paused)
//       const currentlyPaused = ttsService.isCurrentlyPaused();   // Should return true if paused
//       const currentlyProcessing = ttsService.isCurrentlyProcessing();
//       const sessionActive = ttsService.isSessionActive(); // Helper to know if paused OR playing

//       // Update component state
//       setIsSpeaking(currentlyPlaying);
//       setIsPaused(currentlyPaused);
//       // Only show processing if not already playing or paused
//       setIsProcessing(currentlyProcessing && !sessionActive);
//     };

//     // Check every second (Original interval)
//     const intervalId = setInterval(checkStatus, 1000);

//     // Initial check (Unchanged)
//     checkStatus();

//     // Cleanup (Unchanged)
//     return () => {
//       clearInterval(intervalId);
//     };
//     // Note: No dependencies needed if ttsService is a stable singleton instance
//   }, []);

//   // Clean up audio when component unmounts or page changes
//   useEffect(() => {
//     return () => {
//       // Check if the session is active (playing or paused) before stopping
//       if (ttsService.isSessionActive()) { // Use isSessionActive which includes paused state
//         console.log("Reader cleanup: Stopping active TTS session.");
//         ttsService.stopAudio();
//         // Reset local state for consistency on remount/page change
//         setIsSpeaking(false);
//         setIsPaused(false);
//         setIsProcessing(false);
//       }
//     };
//   }, [currentPage]); // Dependency remains currentPage

//   // --- Modified handleTTS for Pause/Resume ---
//   const handleTTS = async () => {
//     // --- Pause/Resume Logic ---
//     if (isPaused) {
//       console.log("Reader: Resuming audio");
//       ttsService.resumeAudio(); // Call resume method from TTSService
//       // Let the useEffect interval update the state naturally
//       return;
//     }
//     if (isSpeaking) {
//       console.log("Reader: Pausing audio");
//       ttsService.pauseAudio(); // Call pause method from TTSService
//       // Let the useEffect interval update the state naturally
//       return;
//     }

//     // --- Original Start Logic (if not speaking or paused) ---
//     if (!isProcessing && currentPageText) { // Prevent starting if already processing
//       console.log("Reader: Starting new playback");
//       try {
//         setIsProcessing(true); // Show processing indicator
//         setIsSpeaking(false);  // Ensure these are false while processing
//         setIsPaused(false);

//         await ttsService.speakTextInChunks(currentPageText, {
//           voice: 'en-US-BrianMultilingualNeural',
//           format: 'audio-24khz-48kbitrate-mono-mp3',
//           rate: 1.0,
//           pitch: '+0Hz'
//         });
//         // Speaking/Paused state will be updated by the interval useEffect once playback starts
//       } catch (error) {
//         console.error('TTS Error starting playback:', error);
//         ttsService.stopAudio(); // Ensure service is stopped on error
//         setIsSpeaking(false);
//         setIsPaused(false);
//         setIsProcessing(false); // Reset processing on error
//       }
//     } else if (!currentPageText) {
//         console.warn("Reader: Cannot start TTS, currentPageText is empty.");
//     } else {
//         console.log("Reader: Already processing TTS, ignoring request.");
//     }
//   };

//   return (
//     <div className="reader">
//       <header className="reader-header">
//         <div className="reader-left">
//           <button onClick={closeBook} className="back-button">
//             ← Back to Library
//           </button>
//         </div>

//         <div className="reader-center">
//           <h2 className="book-title">{bookTitle}</h2>
//           <p className="book-author">{bookAuthor}</p>
//         </div>

//         <div className="reader-right">
//           <div className="controls-container">
//             {/* --- Pass down necessary states to Controls --- */}
//             <Controls
//               currentPage={currentPage}
//               totalPages={totalPages}
//               onPrevious={prevPage}
//               onNext={nextPage}
//               onReadAloud={handleTTS} // Single handler for Read/Pause/Resume
//               isReading={isSpeaking}  // Propagate speaking state
//               isPaused={isPaused}    // Propagate paused state
//               isProcessing={isProcessing} // Propagate processing state
//               onAudiobook={togglePlayMode}
//               isPlayModeActive={isPlayModeVisible}
//             />
//           </div>
//         </div>
//       </header>

//       <div className="reader-container">
//         {/* --- Updated loading overlay condition --- */}
//         {(isLoading || isProcessing) && (
//           <div className="loading-overlay">
//             <div className="loading-spinner"></div>
//             <p>{isLoading ? 'Loading book...' : isProcessing ? 'Preparing audio...' : 'Loading...'}</p>
//           </div>
//         )}

//         <div className="reader-sidebar">
//           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
//         </div>

//         <div className="reader-main">
//           <SearchBar /> {/* Assume SearchBar is implemented */}
//           <div
//             className="epub-content"
//             dangerouslySetInnerHTML={{ __html: currentContent }}
//           ></div>
//         </div>

//         {/* --- Play modes (Unchanged) --- */}
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
import React, { useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import { TTSService } from '../../services/msedge'; // Make sure methods like pauseAudio, resumeAudio, isCurrentlyPaused etc. exist here
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import './Reader.css';

// Get the TTS service instance (Singleton)
const ttsService = TTSService.getInstance();

const Reader: React.FC = () => {
  const {
    bookTitle,
    bookAuthor,
    currentPage,
    totalPages,
    currentContent,
    toc,
    closeBook,
    nextPage,
    prevPage,
    navigateToTocItem,
    isPlayModeVisible,
    togglePlayMode,
    currentPageText, // The full plain text of the current page
    isLoading
  } = useBook();

  // State to select TTS mode (Unchanged)
  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);

  // TTS State (Unchanged)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // --- State Update useEffect (Unchanged) ---
  useEffect(() => {
    const checkStatus = () => {
      const currentlyPlaying = ttsService.isCurrentlyPlaying();
      const currentlyPaused = ttsService.isCurrentlyPaused();
      const currentlyProcessing = ttsService.isCurrentlyProcessing();
      const sessionActive = ttsService.isSessionActive();
      setIsSpeaking(currentlyPlaying);
      setIsPaused(currentlyPaused);
      setIsProcessing(currentlyProcessing && !sessionActive);
    };
    checkStatus();
    const intervalId = setInterval(checkStatus, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // --- Cleanup useEffect (Unchanged) ---
  useEffect(() => {
    return () => {
      if (ttsService.isSessionActive()) {
        console.log("Reader cleanup: Stopping active TTS session.");
        ttsService.stopAudio();
        setIsSpeaking(false);
        setIsPaused(false);
        setIsProcessing(false);
      }
    };
  }, [currentPage]);

  // --- Modified handleTTS for Pause/Resume AND Selection ---
  const handleTTS = async () => {
    // --- 1. Handle Pause/Resume First ---
    if (isPaused) {
      console.log("Reader: Resuming audio");
      ttsService.resumeAudio();
      return; // Action handled, exit
    }
    if (isSpeaking) {
      console.log("Reader: Pausing audio");
      ttsService.pauseAudio();
      return; // Action handled, exit
    }

    // --- 2. Handle Starting New Playback (If not paused, speaking, or processing) ---
    if (!isProcessing && currentPageText) {
      let textToSpeak = currentPageText; // Default: read full page

      // --- Check for User Selection ---
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      // Check if there's selected text AND if the selection originated within the epub content area
      if (selectedText && selection?.anchorNode?.parentElement?.closest('.epub-content')) {
          console.log(`Reader: User selected text: "${selectedText.substring(0, 50)}..."`);
          // Find where the selection starts within the full plain text
          const startIndex = currentPageText.indexOf(selectedText);

          if (startIndex !== -1) {
              // If found, adjust the text to speak to start from the selection
              console.log(`Reader: Found selected text starting at index ${startIndex}. Reading from selection.`);
              textToSpeak = currentPageText.substring(startIndex);
          } else {
              // If selected text couldn't be matched (e.g., due to formatting differences), log a warning and read full page
              console.warn(`Reader: Could not precisely locate selected text within currentPageText. Reading full page instead.`);
          }
      } else {
           // If no text selected or selection outside content, log intention to read full page
           console.log("Reader: No valid text selected in content area. Reading full page.");
      }
      // --- End of Selection Check ---

      console.log(`Reader: Attempting to speak text (first 100 chars): "${textToSpeak.substring(0, 100)}..."`);
      try {
        setIsProcessing(true); // Set processing true before async call
        setIsSpeaking(false);
        setIsPaused(false);

        // Use the determined text (full page or from selection)
        await ttsService.speakTextInChunks(textToSpeak, {
          voice: 'en-US-BrianMultilingualNeural',
          format: 'audio-24khz-48kbitrate-mono-mp3',
          rate: 1.0,
          pitch: '+0Hz'
        });
        // Let the useEffect interval update isSpeaking/isPaused once playback actually starts
      } catch (error) {
        console.error('TTS Error starting playback:', error);
        ttsService.stopAudio(); // Ensure service is stopped on error
        setIsSpeaking(false);
        setIsPaused(false);
        setIsProcessing(false); // Reset processing on error
      }
    } else if (!currentPageText) {
        console.warn("Reader: Cannot start TTS, currentPageText is empty.");
    } else {
        // Log if prevented by processing state
        console.log("Reader: Already processing TTS, ignoring request.");
    }
  }; // End of handleTTS

  // --- Return JSX (Ensure .epub-content class exists) ---
  return (
    <div className="reader">
      <header className="reader-header">
        <div className="reader-left">
          <button onClick={closeBook} className="back-button">
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
              onPrevious={prevPage}
              onNext={nextPage}
              onReadAloud={handleTTS} // Pass the updated handler
              isReading={isSpeaking}
              isPaused={isPaused}
              isProcessing={isProcessing}
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
          <TableOfContents items={toc} onItemClick={navigateToTocItem} />
        </div>
        <div className="reader-main">
          <SearchBar />
          {/* --- CRITICAL: Ensure this div has the class used in selection check --- */}
          <div
            className="epub-content" // <--- This class name must match the check in handleTTS
            dangerouslySetInnerHTML={{ __html: currentContent }}
          ></div>
        </div>
        {isPlayModeVisible && (
        useKokoroTTS ? (
          <KokoroPlayMode
            currentPageContent={currentPageText} // Pass the text content
            onClose={togglePlayMode}           // Pass the close handler
          />
        ) : (
          <SimplePlayMode
            currentPageContent={currentPageText} // Pass the text content
            onClose={togglePlayMode}           // Pass the close handler
          />
        )
      )}
      </div>
    </div>
  );
};

export default Reader;