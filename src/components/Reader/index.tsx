import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBook } from '../../context/BookContext';
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
// import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import { TOCItem } from '../../types/books';
import './Reader.css';
import './ReaderThemes.css';
import FeatureHighlight from './FeatureHighlight';
import { ChevronLeft, ChevronRight, Play, Headphones, Settings } from 'lucide-react';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { useReaderTTS } from '../../hooks/useReaderTTS';
import SettingsWidget from './SettingsWidget';
import MobileTOCDrawer from './MobileTOCDrawer';
import EnhancedLoader from './EnhancedLoader';


// TTS highlight class constant
const CHUNK_HIGHLIGHT_CLASS = 'tts-highlight';

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

  // === Non-TTS States ===
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(true);
  
  // === Custom Hooks ===
  // Settings state and functions from custom hook
  const {
    fontSize,
    theme,
    isSettingsOpen,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    changeTheme,
    toggleSettings,
    closeSettings
  } = useReaderSettings();
  
  // TTS state and functions from custom hook
  const {
    chunks,
    currentChunkIndex,
    isSpeaking,
    isProcessing,
    isPaused,
    useKokoroTTS,
    handleTTS,
    handleStopTTS,
    handleTTSNavigation,
    canTTSResume
  } = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent
  });

  // === Computed Values ===
  // canGoPrev/canGoNext logic moved to Controls component

  // === TTS Logic moved to useReaderTTS hook ===

  // Mobile TOC logic moved to MobileTOCDrawer component


  // Navigation handlers wrapped to stop TTS
  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    handleTTSNavigation();
    navigateToTocItem(item);
  }, [handleTTSNavigation, navigateToTocItem]);

  const handlePrevPage = useCallback(() => {
    handleTTSNavigation();
    prevPage();
  }, [handleTTSNavigation, prevPage]);

  const handleNextPage = useCallback(() => {
    handleTTSNavigation();
    nextPage();
  }, [handleTTSNavigation, nextPage]);

  const handleCloseBookCB = useCallback(() => {
    handleTTSNavigation();
    closeBook();
  }, [handleTTSNavigation, closeBook]);

  // === Render text with current chunk highlighted ===
  const renderContentWithHighlight = useCallback(() => {
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
  }, [chunks, currentChunkIndex]);

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

        {/* Mobile TOC Component */}
        <MobileTOCDrawer 
          toc={toc} 
          onItemClick={handleNavigateToTocItem}
          theme={theme}
        />
        
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
        <EnhancedLoader
          isLoading={isLoading}
          isProcessing={isProcessing}
          isSpeaking={isSpeaking}
          isPaused={isPaused}
          isPlayModeVisible={isPlayModeVisible}
          currentContent={currentContent}
        />
      ) : null}
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="reader-sidebar hidden md:block">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>
      
      {/* Mobile TOC Drawer moved to MobileTOCDrawer component */}
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

    {/* Modular Settings Widget Component */}
    <SettingsWidget
      fontSize={fontSize}
      theme={theme}
      isSettingsOpen={isSettingsOpen}
      increaseFontSize={increaseFontSize}
      decreaseFontSize={decreaseFontSize}
      resetFontSize={resetFontSize}
      changeTheme={changeTheme}
      closeSettings={closeSettings}
    />

    {/* Theme styles moved to ReaderThemes.css */}
  </div>
 );
};

export default Reader;
