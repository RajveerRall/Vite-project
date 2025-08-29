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
    isLoading
  } = useBook();

  // === Non-TTS States ===
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  
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
  // Settings state and functions from custom hook - moved to top level to follow Rules of Hooks
  const settingsHook = useReaderSettings();
  
  // Settings values
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
  
  // TTS state and functions from custom hook - moved to top level to follow Rules of Hooks
  const ttsHook = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent,
    selectedVoice,
    ttsSpeed
  });
  
  // TTS functionality
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
    canTTSResume,
    highlightedContent: ttsHighlightedContent
  } = ttsHook;

  // Auto-scroll hook for TTS highlighting
  const { scrollToHighlight } = useAutoScroll({
    isActive: isSpeaking || isProcessing || isPaused,
    highlightedContent: ttsHighlightedContent,
    scrollContainer: document.querySelector('.reader-main') as HTMLElement | null
  });

  // === Computed Values ===
  // canGoPrev/canGoNext logic moved to Controls component

  // === TTS Logic moved to useReaderTTS hook ===

  // Mobile TOC logic moved to MobileTOCDrawer component


  // === TTS Settings Handlers ===
  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    // Stop current TTS if playing to apply new voice
    if (isSpeaking || isPaused) {
      handleStopTTS();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setTtsSpeed(speed);
    // Stop current TTS if playing to apply new speed
    if (isSpeaking || isPaused) {
      handleStopTTS();
    }
  };

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
  // This is now handled by the useReaderTTS hook which generates highlightedContent

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
      {/* Mobile: Stacked layout */}
      <div className="reader-header-mobile md:hidden">
        {/* Top row: Back button and title */}
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
        
        {/* Book title - centered */}
        <div className="text-center">
          <h2 className="book-title text-lg sm:text-xl">{bookTitle}</h2>
        </div>
        
        {/* Action buttons row */}
        <div className="flex items-center justify-center gap-3 mt-2">
          {/* Settings Button */}
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

          {/* Mobile TOC Component - Now positioned next to settings icon */}
          {isEnhanced && (
            <MobileTOCDrawer 
              toc={toc} 
              onItemClick={handleNavigateToTocItem}
              theme={theme}
            />
          )}

          {/* Auto-scroll to highlight button */}
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

      {/* Desktop: Original horizontal layout */}
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
        
        <div className="reader-center">
          <h2 className="book-title">{bookTitle}</h2>
        </div>
        
        <div className="reader-right flex items-center gap-3">
          {/* Settings Button */}
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

          {/* Auto-scroll to highlight button */}
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

          {/* Mobile TOC Component */}
          {isEnhanced && (
            <MobileTOCDrawer 
              toc={toc} 
              onItemClick={handleNavigateToTocItem}
              theme={theme}
            />
          )}
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
           data-short-content={currentContent && currentContent.length < 1000 ? 'true' : 'false'}
         >
          {/* Debug TTS states */}
          {(() => {
            console.log('[Reader] TTS States:', {
              isSpeaking,
              isProcessing,
              isPaused,
              hasHighlightedContent: !!ttsHighlightedContent,
              highlightedContentLength: ttsHighlightedContent?.length || 0,
              currentContentLength: currentContent?.length || 0
            });
            return null;
          })()}
          
          {/* Show TTS-highlighted content when TTS is active, otherwise show formatted HTML content */}
          {(isSpeaking || isProcessing || isPaused) && ttsHighlightedContent ? (
            <div dangerouslySetInnerHTML={{ __html: ttsHighlightedContent }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: currentContent }} />
          )}
        </div>
      </div>
      {isPlayModeVisible && (
        useKokoroTTS ? (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        ) : (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        )
      )}
    </div>

    {/* Bottom Controls - Always visible and accessible */}
    <div className="reader-bottom-controls fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 md:hidden">
      <div className="px-4 py-3">
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

    {/* Desktop Bottom Controls - Fixed position for larger screens */}
    <div className="reader-bottom-controls-desktop hidden md:block fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-xl border border-gray-200 z-30">
      <div className="px-6 py-3">
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
    {showFeatureHighlight && (<FeatureHighlight onClose={() => setShowFeatureHighlight(false)} />)}

    {/* Modular Settings Widget Component - Only render after enhanced loading */}
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

         {/* Theme styles moved to ReaderThemes.css */}
     
     {/* Floating Read Button - appears when text is selected */}
     <FloatingReadButton 
       onRead={handleTTS}
       isVisible={isEnhanced}
     />
   </div>
 );
};

export default Reader;
