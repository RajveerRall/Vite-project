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