// // // // // src/components/Reader/index.tsx
// // // // import React from 'react';
// // // // import { useBook } from '../../context/BookContext';
// // // // import { useTextToSpeech } from '../../hooks/useTextToSpeech';
// // // // import SimplePlayMode from './SimplePlayMode';
// // // // // import TableOfContents from './';
// // // // // import SearchBar from './SearchBar';
// // // // import Controls from './Controls';
// // // // import './Reader.css';
// // // // import TableOfContents from '../Library/TableOfContents';
// // // // import SearchBar from '../Library/SearchBar';

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

// // // //   const { speak, stop, isSpeaking } = useTextToSpeech();

// // // //   const handleTTS = () => {
// // // //     if (isSpeaking) {
// // // //       stop();
// // // //     } else {
// // // //       speak(currentPageText);
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="reader">
// // // //       <header className="reader-header">
// // // //         <div className="reader-nav">
// // // //           <button onClick={closeBook} className="back-button">
// // // //             ← Back to Library
// // // //           </button>
// // // //           <h2>{bookTitle}</h2>
// // // //           <p className="author">{bookAuthor}</p>
// // // //         </div>
        
// // // //         <Controls 
// // // //           currentPage={currentPage}
// // // //           totalPages={totalPages}
// // // //           onPrevious={prevPage}
// // // //           onNext={nextPage}
// // // //           onReadAloud={handleTTS}
// // // //           isReading={isSpeaking}
// // // //           onAudiobook={togglePlayMode}
// // // //           isPlayModeActive={isPlayModeVisible}
// // // //         />
// // // //       </header>
      
// // // //       <div className="reader-container">
// // // //         {isLoading && (
// // // //           <div className="loading-overlay">
// // // //             <div className="loading-spinner"></div>
// // // //             <p>Loading book...</p>
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
// // // //           <SimplePlayMode
// // // //             currentPageContent={currentPageText}
// // // //             onClose={() => togglePlayMode()}
// // // //           />
// // // //         )}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Reader;


// // // // src/components/Reader/index.tsx
// // // import React, { useState } from 'react';
// // // import { useBook } from '../../context/BookContext';
// // // import { useTextToSpeech } from '../../hooks/useTextToSpeech';
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
  
// // //   // State to select TTS mode
// // //   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);

// // //   const { speak, stop, isSpeaking } = useTextToSpeech();

// // //   const handleTTS = () => {
// // //     if (isSpeaking) {
// // //       stop();
// // //     } else {
// // //       speak(currentPageText);
// // //     }
// // //   };
  
// // //   // Toggle TTS mode (Web Speech API vs Kokoro)
// // //   const toggleTTSMode = () => {
// // //     setUseKokoroTTS(prev => !prev);
// // //   };

// // //   return (
// // //     <div className="reader">
// // //       <header className="reader-header">
// // //         <div className="reader-nav">
// // //           <button onClick={closeBook} className="back-button">
// // //             ← Back to Library
// // //           </button>
// // //           <h2>{bookTitle}</h2>
// // //           <p className="author">{bookAuthor}</p>
// // //         </div>
        
// // //         <Controls 
// // //           currentPage={currentPage}
// // //           totalPages={totalPages}
// // //           onPrevious={prevPage}
// // //           onNext={nextPage}
// // //           onReadAloud={handleTTS}
// // //           isReading={isSpeaking}
// // //           onAudiobook={togglePlayMode}
// // //           isPlayModeActive={isPlayModeVisible}
// // //         />
        
// // //         <div className="tts-mode-toggle">
// // //           <label className="toggle-label">
// // //             TTS Engine:
// // //             <button 
// // //               onClick={toggleTTSMode} 
// // //               className="tts-toggle-button"
// // //             >
// // //               {useKokoroTTS ? 'Using Kokoro AI (High Quality)' : 'Using Web Speech API (Basic)'}
// // //             </button>
// // //           </label>
// // //         </div>
// // //       </header>
      
// // //       <div className="reader-container">
// // //         {isLoading && (
// // //           <div className="loading-overlay">
// // //             <div className="loading-spinner"></div>
// // //             <p>Loading book...</p>
// // //           </div>
// // //         )}
        
// // //         <div className="reader-sidebar">
// // //           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
// // //         </div>
        
// // //         <div className="reader-main">
// // //           <SearchBar />
          
// // //           <div 
// // //             className="epub-content" 
// // //             dangerouslySetInnerHTML={{ __html: currentContent }}
// // //           ></div>
// // //         </div>

// // //         {isPlayModeVisible && (
// // //           useKokoroTTS ? (
// // //             <KokoroPlayMode
// // //               currentPageContent={currentPageText}
// // //               onClose={() => togglePlayMode()}
// // //             />
// // //           ) : (
// // //             <SimplePlayMode
// // //               currentPageContent={currentPageText}
// // //               onClose={() => togglePlayMode()}
// // //             />
// // //           )
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Reader;





// // // src/components/Reader/index.tsx
// // import React, { useState } from 'react';
// // import { useBook } from '../../context/BookContext';
// // // import { useTextToSpeech } from '../../hooks/useTextToSpeech';
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

// //   // const { speak, stop, isSpeaking } = useTextToSpeech();
// //     const [isSpeaking, setIsSpeaking] = useState(false);
// //   const ttsService = TTSService.getInstance();

// //   const handleTTS = async () => {
// //     if (isSpeaking) {
// //       // Stop logic (in this case, just reset state)
// //       setIsSpeaking(false);
// //       return;
// //     }

// //     try {
// //       setIsSpeaking(true);
// //       const audioBuffer = await ttsService.generateAudio(currentPageText);
// //       await ttsService.playAudio(audioBuffer);
// //     } catch (error) {
// //       console.error('TTS Error:', error);
// //     } finally {
// //       setIsSpeaking(false);
// //     }
// //   };
  
// //   // // Toggle TTS mode (Web Speech API vs Kokoro)
// //   // const toggleTTSMode = () => {
// //   //   setUseKokoroTTS(prev => !prev);
// //   // };

// //   return (
// //     <div className="reader">
// //     <header className="reader-header">
// //       <div className="reader-left">
// //         <button onClick={closeBook} className="back-button">
// //           ← Back to Library
// //         </button>
// //       </div>
      
// //       <div className="reader-center">
// //         <h2 className="book-title">{bookTitle}</h2>
// //         <p className="book-author">{bookAuthor}</p>
// //       </div>
      
// //       <div className="reader-right">
// //         <div className="controls-container">
// //           <Controls 
// //             currentPage={currentPage}
// //             totalPages={totalPages}
// //             onPrevious={prevPage}
// //             onNext={nextPage}
// //             onReadAloud={handleTTS}
// //             isReading={isSpeaking}
// //             onAudiobook={togglePlayMode}
// //             isPlayModeActive={isPlayModeVisible}
// //           />
          
// //           <div className="tts-toggle">
// //             {/* <span className="tts-toggle-label">TTS Engine:</span>
// //             <button 
// //               onClick={toggleTTSMode}
// //               className={`tts-toggle-button ${useKokoroTTS ? 'kokoro-active' : 'basic-active'}`}
// //             >
// //               {useKokoroTTS ? 'Kokoro AI' : 'Web Speech API'}
// //             </button> */}
// //           </div>
// //         </div>
// //       </div>
// //     </header>
      
// //       <div className="reader-container">
// //         {isLoading && (
// //           <div className="loading-overlay">
// //             <div className="loading-spinner"></div>
// //             <p>Loading book...</p>
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
// import { TTSService } from '../../services/msedge';
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
  
//   // State to select TTS mode
//   const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
  
//   // Get the TTS service instance
//   const ttsService = TTSService.getInstance();

//   // Clean up audio when component unmounts
//   useEffect(() => {
//     return () => {
//       if (isSpeaking) {
//         ttsService.stopAudio();
//       }
//     };
//   }, [isSpeaking]);

//   const handleTTS = async () => {
//     if (isSpeaking) {
//       // Stop the audio if currently speaking
//       ttsService.stopAudio();
//       setIsSpeaking(false);
//       return;
//     }

//     try {
//       // Set processing state to show loading indicator if needed
//       setIsProcessing(true);
//       setIsSpeaking(true);
      
//       // Generate audio from current page text
//       const audioBlob = await ttsService.generateAudio(currentPageText, {
//         voice: 'en-US-BrianMultilingualNeural',
//         format: 'webm-24khz-16bit-mono-opus',
//         rate: 1.0,
//         pitch: '+0Hz'
//       });
      
//       // Play the generated audio
//       await ttsService.playAudio(audioBlob);
      
//       // When audio playback is complete
//       setIsSpeaking(false);
//     } catch (error) {
//       console.error('TTS Error:', error);
//       setIsSpeaking(false);
//     } finally {
//       setIsProcessing(false);
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
//             <Controls 
//               currentPage={currentPage}
//               totalPages={totalPages}
//               onPrevious={prevPage}
//               onNext={nextPage}
//               onReadAloud={handleTTS}
//               isReading={isSpeaking}
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
//             <p>{isProcessing ? 'Generating audio...' : 'Loading book...'}</p>
//           </div>
//         )}
        
//         <div className="reader-sidebar">
//           <TableOfContents items={toc} onItemClick={navigateToTocItem} />
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
//               onClose={() => togglePlayMode()}
//             />
//           ) : (
//             <SimplePlayMode
//               currentPageContent={currentPageText}
//               onClose={() => togglePlayMode()}
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
import { TTSService } from '../../services/msedge';
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import './Reader.css';

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
    currentPageText,
    isLoading
  } = useBook();
  
  // State to select TTS mode
  const [useKokoroTTS, setUseKokoroTTS] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get the TTS service instance
  const ttsService = TTSService.getInstance();

  // Update speaking state based on TTS service
  useEffect(() => {
    const checkSpeakingStatus = () => {
      setIsSpeaking(ttsService.isCurrentlyPlaying());
      setIsProcessing(ttsService.isCurrentlyProcessing() && !ttsService.isCurrentlyPlaying());
    };
    
    // Check every second while TTS is active
    const intervalId = setInterval(checkSpeakingStatus, 1000);
    
    // Initial check
    checkSpeakingStatus();
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Clean up audio when component unmounts or page changes
  useEffect(() => {
    return () => {
      if (ttsService.isCurrentlyPlaying()) {
        ttsService.stopAudio();
        setIsSpeaking(false);
        setIsProcessing(false);
      }
    };
  }, [currentPage]);

  const handleTTS = async () => {
    if (isSpeaking) {
      // Stop the audio if currently speaking
      ttsService.stopAudio();
      setIsSpeaking(false);
      setIsProcessing(false);
      return;
    }

    try {
      // Set processing state to show loading indicator
      setIsProcessing(true);
      
      // Use the chunked TTS method
      await ttsService.speakTextInChunks(currentPageText, {
        voice: 'en-US-BrianMultilingualNeural',
        format: 'audio-24khz-48kbitrate-mono-mp3',
        rate: 1.0,
        pitch: '+0Hz'
      });
      
      // Speaking state will be updated by the interval in useEffect
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      setIsProcessing(false);
    }
  };

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
              onReadAloud={handleTTS}
              isReading={isSpeaking}
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
            <p>{isProcessing ? 'Preparing audio...' : 'Loading book...'}</p>
          </div>
        )}
        
        <div className="reader-sidebar">
          <TableOfContents items={toc} onItemClick={navigateToTocItem} />
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
              onClose={() => togglePlayMode()}
            />
          ) : (
            <SimplePlayMode
              currentPageContent={currentPageText}
              onClose={() => togglePlayMode()}
            />
          )
        )}
      </div>
    </div>
  );
};

export default Reader;