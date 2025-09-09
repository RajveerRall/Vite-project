import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBook } from '../../context/BookContext';
import SimplePlayMode from './SimplePlayMode';
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
import { useAutoScroll } from '../../hooks/useAutoScroll';
import SettingsWidget from './SettingsWidget';
import MobileTOCDrawer from './MobileTOCDrawer';
import EnhancedLoader from './EnhancedLoader';
import FloatingReadButton from './FloatingReadButton';


// TTS highlighting is now handled by the useReaderTTS hook

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
    isLoading,
    currentChapterTitle,
  } = useBook();

  // === Non-TTS States ===
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  
  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);
  
  // === Chapter Navigation Arrows ===
  const [showNavigationArrows, setShowNavigationArrows] = useState<boolean>(false);
  const [arrowsTimeout, setArrowsTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Mobile detection effect
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // Defer feature highlight to improve initial load performance
  useEffect(() => {
    const timer = setTimeout(() => setShowFeatureHighlight(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Progressive loading: show basic reader first, enhance progressively
  useEffect(() => {
    const timer = setTimeout(() => setIsEnhanced(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // === Custom Hooks ===
  const settingsHook = useReaderSettings();
  
  const {
    fontSize,
    theme,
    isSettingsOpen,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    changeTheme,
    toggleSettings,
    closeSettings,
    selectedVoice,
    ttsSpeed,
    setSelectedVoice,
    setTtsSpeed
  } = settingsHook;
  
  const ttsHook = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent,
    selectedVoice,
    ttsSpeed
  });
  
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
    handlePreviousSentence,
    handleNextSentence,
    canTTSResume,
    highlightedContent: ttsHighlightedContent
  } = ttsHook;

  const { scrollToHighlight } = useAutoScroll({
    isActive: isSpeaking || isProcessing || isPaused,
    highlightedContent: ttsHighlightedContent,
    scrollContainer: document.querySelector('.reader-main') as HTMLElement | null
  });


  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (isSpeaking || isPaused) {
      handleStopTTS();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setTtsSpeed(speed);
    if (isSpeaking || isPaused) {
      handleStopTTS();
    }
  };

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

  const handleChapterNavigation = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      handlePrevPage();
    } else {
      handleNextPage();
    }
    setTimeout(() => {
      const readerMain = document.querySelector('.reader-main');
      if (readerMain) {
        readerMain.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [handlePrevPage, handleNextPage]);

  const handlePageClick = useCallback(() => {
    setShowNavigationArrows(true);
    if (arrowsTimeout) {
      clearTimeout(arrowsTimeout);
    }
    const timeout = setTimeout(() => {
      setShowNavigationArrows(false);
    }, 3000);
    setArrowsTimeout(timeout);
  }, [arrowsTimeout]);

  useEffect(() => {
    return () => {
      if (arrowsTimeout) {
        clearTimeout(arrowsTimeout);
      }
    };
  }, [arrowsTimeout]);

  return (
  <div className={`reader theme-${theme}`}>
    <header className="reader-header">
      {/* Mobile: Stacked layout */}
      <div className="reader-header-mobile md:hidden">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={handleCloseBookCB} 
            className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
          >
            <ChevronLeft className="w-4 h-4" /> 
            <span className="hidden sm:inline">Back to Library</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
        
        <div className="text-center">
          <h2 className="book-title text-lg sm:text-xl">{bookTitle}</h2>
          {currentChapterTitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{currentChapterTitle}</p>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-3 mt-2">
          {isEnhanced && (
            <button 
              onClick={toggleSettings}
              className="settings-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Open reading settings"
              title="Reading settings"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          )}

          {isEnhanced && (
            <MobileTOCDrawer 
              toc={toc} 
              onItemClick={handleNavigateToTocItem}
              theme={theme}
               openByDefault={isMobile}
            />
          )}

          {(isSpeaking || isProcessing || isPaused) && (
            <button 
              onClick={() => scrollToHighlight()}
              className="scroll-highlight-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Scroll to current highlight"
              title="Scroll to current highlight"
            >
              <Headphones className="w-5 h-5" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          )}

        </div>
      </div>

      <div className="reader-header-desktop hidden md:flex items-center justify-between w-full">
        <div className="reader-left">
          <button 
            onClick={handleCloseBookCB} 
            className="back-button text-sm font-medium text-gray-600 hover:text-amber-800 flex items-center gap-x-1"
          >
            <ChevronLeft className="w-4 h-4" /> 
            Back to Library
          </button>
        </div>
        
        <div className="reader-center text-center">
          <h2 className="book-title">{bookTitle}</h2>
          {currentChapterTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{currentChapterTitle}</p>
          )}
        </div>
        
        <div className="reader-right flex items-center gap-3">
          {isEnhanced && (
            <button 
              onClick={toggleSettings}
              className="settings-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Open reading settings"
              title="Reading settings"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          )}

          {(isSpeaking || isProcessing || isPaused) && (
            <button 
              onClick={() => scrollToHighlight()}
              className="scroll-highlight-button flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Scroll to current highlight"
              title="Scroll to current highlight"
            >
              <Headphones className="w-5 h-5" />
              <span className="text-sm font-medium">Highlight</span>
            </button>
          )}
        </div>
      </div>
    </header>

    <div className="reader-container">
      {((isLoading && !currentContent && !isPlayModeVisible) || (isProcessing && !isSpeaking && !isPaused && !isPlayModeVisible)) ? (
        <EnhancedLoader />
      ) : null}

      <div className="reader-sidebar hidden md:block">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>

      <div className="reader-main">
        <div
          className="epub-content"
          onClick={handlePageClick}
          style={{ whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={{ __html: ttsHighlightedContent || currentContent }}
        />

        {showNavigationArrows && (
          <>
            <button
              onClick={() => handleChapterNavigation('prev')}
              className="chapter-nav-arrow chapter-nav-arrow-left"
              aria-label="Previous chapter"
              title="Previous chapter"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            <button
              onClick={() => handleChapterNavigation('next')}
              className="chapter-nav-arrow chapter-nav-arrow-right"
              aria-label="Next chapter"
              title="Next chapter"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}
      </div>
      {isPlayModeVisible && (
        useKokoroTTS ? (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        ) : (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        )
      )}
    </div>

    <div className="reader-bottom-controls fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-lg z-30 md:hidden">
      <div className="px-4 py-3">
        <Controls
          currentPage={currentPageDisplay}
          totalPages={totalPages}
          onPrevious={handlePrevPage}
          onNext={handleNextPage}
          onReadAloud={handleTTS}
          onStopTTS={handleStopTTS}
          onPreviousSentence={handlePreviousSentence}
          onNextSentence={handleNextSentence}
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

    <div className="reader-bottom-controls-desktop hidden md:block fixed bottom-6 left-1/2 transform -translate-x-1/2 rounded-full shadow-xl border border-gray-200 z-30">
      <div className="px-6 py-3">
        <Controls
          currentPage={currentPageDisplay}
          totalPages={totalPages}
          onPrevious={handlePrevPage}
          onNext={handleNextPage}
          onReadAloud={handleTTS}
          onStopTTS={handleStopTTS}
          onPreviousSentence={handlePreviousSentence}
          onNextSentence={handleNextSentence}
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
    {showFeatureHighlight && (<FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />)}

    {isEnhanced && (
      <SettingsWidget
        fontSize={fontSize}
        theme={theme}
        isSettingsOpen={isSettingsOpen}
        increaseFontSize={increaseFontSize}
        decreaseFontSize={decreaseFontSize}
        resetFontSize={resetFontSize}
        changeTheme={changeTheme}
        selectedVoice={selectedVoice}
        onVoiceChange={handleVoiceChange}
        ttsSpeed={ttsSpeed}
        onSpeedChange={handleSpeedChange}
        closeSettings={closeSettings}
      />
    )}
     
     <FloatingReadButton 
       onRead={handleTTS}
       isVisible={isEnhanced}
     />
   </div>
 );
};

export default Reader;
