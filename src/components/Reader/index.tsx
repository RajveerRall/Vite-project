import React, { useCallback, useRef } from 'react';
import { useBook } from '../../context/BookContext';
import SimplePlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
import EnhancedLoader from './EnhancedLoader';
import FeatureHighlight from './FeatureHighlight';
import FloatingReadButton from './FloatingReadButton';
import VideoQuoteModal from './VideoQuoteModal';
import SettingsWidget from './SettingsWidget';
import './Reader.css';
import './ReaderThemes.css';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { useReaderTTS } from '../../hooks/useReaderTTS';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useAutoScroll } from '../../hooks/useAutoScroll';
// Phase 1: Import new hooks
import { useFullCast, useReaderNavigation, useReaderUI, useMobileDetection } from '../../hooks/reader';
// Phase 3: Import extracted components
import { ReaderHeader } from './ReaderHeader';
import { ReaderContent } from './ReaderContent';
import { FullCastOverlay } from './FullCastOverlay';
import { ReaderControlsContainer } from './ReaderControlsContainer';


// TTS highlighting is now handled by the useReaderTTS hook

const Reader: React.FC = () => {
  const {
    bookTitle,
    bookAuthor,
    currentBook, // Add this to access coverUrl
    currentPageDisplay,
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
    isPageLoading,
    currentChapterTitle,
    totalPages,
  } = useBook();
  
  // Ref for reading progress tracking
  const readerMainRef = useRef<HTMLDivElement>(null);
  
  // Ref to track auto-advance state to prevent loops
  const isAutoAdvancingRef = useRef<boolean>(false);
  
  // Ref to store handleTTS function so it can be accessed in the callback
  const handleTTSRef = useRef<(() => void) | null>(null);
  
  // Ref to store handleStopTTS function so it can be accessed in the callback
  const handleStopTTSRef = useRef<(() => void) | null>(null);
  
  // Phase 1: Use extracted hooks
  const isMobile = useMobileDetection();
  
  const uiState = useReaderUI(currentBook);
  const {
    isVideoModalOpen,
    selectedTextForVideo,
    openVideoModal,
    closeVideoModal,
    showFeatureHighlight,
    closeFeatureHighlight,
    showNavigationArrows,
    handlePageClick,
    isEnhanced,
  } = uiState;

  const fullCast = useFullCast(currentPageText, currentContent, currentPageDisplay);
  const {
    isActive: fullCastActive,
    status: fullCastStatus,
    buffered: fullCastBuffered,
    needsTap: fullCastNeedsTap,
    isPaused: fullCastPaused,
    hasStartedPlaying,
    pause: fullCastPause,
    resume: fullCastResume,
    stop: fullCastStop,
  } = fullCast;

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
    setSelectedVoice,
    ttsSpeed,
    setTtsSpeed,
    autoContinueChapters
  } = settingsHook;

  // Ref to store the target page number we're navigating to
  const targetPageRef = useRef<number | null>(null);
  
  // Callback for when TTS playback completes - uses ref to avoid circular dependency
  const handlePlaybackComplete = useCallback(() => {
    // Only auto-advance if enabled and not already advancing
    if (!autoContinueChapters || isAutoAdvancingRef.current) {
      return;
    }
    
    // Check if there's a next page available
    if (currentPageDisplay < totalPages - 1) {
      console.log('[Reader] TTS finished, auto-advancing to next chapter...');
      isAutoAdvancingRef.current = true;
      
      // Store the current page number to track when it actually changes
      const currentPage = currentPageDisplay;
      const targetPage = currentPage + 1;
      targetPageRef.current = targetPage;
      
      // Stop any existing playback before navigating
      if (handleStopTTSRef.current) {
        handleStopTTSRef.current();
      }
      
      // Navigate to next page
      nextPage();
      
      // Wait for page to load, then auto-start TTS
      // Poll for content to be loaded and page number to change
      let attempts = 0;
      const maxAttempts = 20; // Increased to allow more time for page loading
      const checkInterval = 200;
      
      const tryStartTTS = () => {
        attempts++;
        
        // Check multiple conditions:
        // 1. Page is not loading
        // 2. Page number has actually changed
        // 3. Content is available
        const pageChanged = currentPageDisplay === targetPage;
        const pageNotLoading = !isPageLoading;
        const readerContent = document.querySelector('.reader-main');
        const hasContent = readerContent && readerContent.textContent && readerContent.textContent.trim().length > 0;
        
        // Just verify page has changed - the useEffect will handle starting TTS
        if ((pageChanged && pageNotLoading && hasContent) || attempts >= maxAttempts) {
          if (currentPageDisplay === targetPage && currentPageText && currentPageText.trim().length > 0) {
            console.log('[Reader] Page loaded successfully, useEffect will auto-start TTS', { 
              attempts, 
              pageChanged, 
              pageNotLoading, 
              hasContent,
              currentPageDisplay,
              targetPage,
              hasPageText: !!currentPageText 
            });
            // The useEffect hook will handle starting TTS once all conditions are met
          } else {
            // Page hasn't loaded yet, continue checking
            if (attempts < maxAttempts) {
              setTimeout(tryStartTTS, checkInterval);
            } else {
              console.warn('[Reader] Timeout waiting for page to load, aborting auto-start TTS');
              isAutoAdvancingRef.current = false;
              targetPageRef.current = null;
            }
          }
        } else {
          // Continue checking
          setTimeout(tryStartTTS, checkInterval);
        }
      };
      
      // Start checking after initial delay
      setTimeout(tryStartTTS, 500);
    } else {
      console.log('[Reader] TTS finished on last chapter, no auto-advance');
    }
  }, [autoContinueChapters, currentPageDisplay, totalPages, nextPage, isPageLoading, currentPageText]);

  const ttsHook = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent,
    selectedVoice,
    ttsSpeed: ttsSpeed, // Use actual speed setting instead of hardcoded 1
    onPlaybackComplete: handlePlaybackComplete
  });
  
  const {
    chunks: _chunks,
    currentChunkIndex: _currentChunkIndex,
    isSpeaking,
    isProcessing,
    isPaused,
    useKokoroTTS,
    handleTTS,
    handleStopTTS,
    handleTTSNavigation,
    handlePreviousSentence,
    handleNextSentence,
    handlePreviewScroll,
    handleSeekToPercentage,
    canTTSResume,
    highlightedContent: ttsHighlightedContent,
    setPlaybackRate,
    anonymousLimit,
    hasFinishedPlayback
  } = ttsHook;
  
  // Update the refs with the latest functions
  handleTTSRef.current = handleTTS;
  handleStopTTSRef.current = handleStopTTS;
  
  // Handle manual TTS stop - reset auto-advance flag
  const handleStopTTSWithReset = useCallback(() => {
    isAutoAdvancingRef.current = false;
    targetPageRef.current = null;
    handleStopTTS();
  }, [handleStopTTS]);
  
  // Effect to auto-start TTS when page loads after auto-navigation
  React.useEffect(() => {
    // Only auto-start if:
    // 1. We're in auto-advance mode
    // 2. Page has changed to target page
    // 3. Page is not loading
    // 4. Content is available
    if (
      isAutoAdvancingRef.current &&
      targetPageRef.current !== null &&
      currentPageDisplay === targetPageRef.current &&
      !isPageLoading &&
      currentPageText &&
      currentPageText.trim().length > 0
    ) {
      console.log('[Reader] Page loaded, auto-starting TTS after navigation', {
        currentPageDisplay,
        targetPage: targetPageRef.current,
        hasText: !!currentPageText
      });
      
      // Small delay to ensure TTS hook has fully updated
      const timeoutId = setTimeout(() => {
        if (handleTTSRef.current && isAutoAdvancingRef.current) {
          handleTTSRef.current();
          // Clear flags after starting
          setTimeout(() => {
            isAutoAdvancingRef.current = false;
            targetPageRef.current = null;
          }, 1000);
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentPageDisplay, isPageLoading, currentPageText]);

  const { scrollToHighlight } = useAutoScroll({
    isActive: isSpeaking || isProcessing || isPaused,
    highlightedContent: ttsHighlightedContent,
    scrollContainer: document.querySelector('.reader-main') as HTMLElement | null
  });

  const readingProgress = useReadingProgress(readerMainRef, currentPageDisplay);
  
  // Reset auto-advance flag when page changes (to handle edge cases)
  React.useEffect(() => {
    // Small delay to allow for state updates
    const timeoutId = setTimeout(() => {
      if (!isSpeaking && !isPaused && !isProcessing) {
        isAutoAdvancingRef.current = false;
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [currentPageDisplay, isSpeaking, isPaused, isProcessing]);


  const handleVoiceChange = (voice: string) => {
    console.log(`[Reader] Voice change requested: ${voice}`);
    setSelectedVoice(voice);
  };

  const handleSpeedChangeWithStop = (speed: number) => {
    setTtsSpeed(speed);
    
    // If TTS is currently playing, change the playback rate instead of stopping
    if (isSpeaking || isPaused) {
      setPlaybackRate(speed);
      console.log(`Changed playback rate to ${speed}x while playing`);
      return; // Don't stop playback
    }
  };

  // Phase 1: Use extracted navigation hook
  const navigation = useReaderNavigation({
    handleTTSNavigation,
    navigateToTocItem,
    prevPage,
    nextPage,
    closeBook,
  });

  const {
    handleNavigateToTocItem,
    handlePrevPage,
    handleNextPage,
    handleCloseBook: handleCloseBookCB,
    handleChapterNavigation,
  } = navigation;

  const handleCreateVideo = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';
    
    if (selectedText) {
      openVideoModal(selectedText);
    }
  }, [openVideoModal]);

  // Calculate if this is first open
  const isFirstOpen = !currentBook?.lastRead || 
    (Date.now() - new Date(currentBook.lastRead).getTime() < 5000);

  return (
  <div className={`reader theme-${theme}`}>
      <ReaderHeader
        bookTitle={bookTitle}
        currentChapterTitle={currentChapterTitle}
        onClose={handleCloseBookCB}
        onNavigateToTocItem={handleNavigateToTocItem}
        onScrollToHighlight={scrollToHighlight}
        isMobile={isMobile}
        isEnhanced={isEnhanced}
        isFirstOpen={isFirstOpen}
        theme={theme}
        showTTSHighlight={isSpeaking || isProcessing || isPaused}
              toc={toc} 
      />

    <div className="reader-container">
      {((isLoading && !currentContent && !isPlayModeVisible) || (isProcessing && !isSpeaking && !isPaused && !isPlayModeVisible)) ? (
        <EnhancedLoader />
      ) : null}

        <FullCastOverlay
          isActive={fullCastActive}
          status={fullCastStatus}
          buffered={fullCastBuffered}
          hasStartedPlaying={hasStartedPlaying}
        />

      <div className="reader-sidebar hidden md:block">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>

        <ReaderContent
          content={currentContent}
          highlightedContent={ttsHighlightedContent}
          onPageClick={handlePageClick}
          onChapterNavigation={handleChapterNavigation}
          showNavigationArrows={showNavigationArrows}
          contentRef={readerMainRef}
        />
      {isPlayModeVisible && (
        useKokoroTTS ? (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        ) : (
          <SimplePlayMode currentPageContent={currentPageText} onClose={togglePlayMode} />
        )
      )}
    </div>

      <ReaderControlsContainer
          readingProgress={readingProgress}
          onReadAloud={handleTTS}
          onStopTTS={handleStopTTSWithReset}
          onPreviousSentence={handlePreviousSentence}
          onNextSentence={handleNextSentence}
          isReading={isSpeaking}
          isPaused={isPaused}
          isProcessing={isProcessing && !(isSpeaking || isPaused)}
          canResume={canTTSResume}
          isReadButtonActive={isSpeaking || isPaused || canTTSResume}
          currentChunkIndex={_currentChunkIndex}
          totalChunks={_chunks.length}
          ttsSpeed={ttsSpeed}
          onSpeedChange={handleSpeedChangeWithStop}
          onOpenSettings={toggleSettings}
          onPreviewScroll={handlePreviewScroll}
          onSeekToPercentage={handleSeekToPercentage}
          fullCastActive={fullCastActive}
          fullCastStatus={fullCastStatus}
          fullCastBuffered={fullCastBuffered}
          fullCastNeedsTap={fullCastNeedsTap}
            fullCastPaused={fullCastPaused}
        onFullCastStop={fullCastStop}
        onFullCastPause={fullCastPause}
        onFullCastResume={fullCastResume}
          anonymousLimit={anonymousLimit}
        />
    {showFeatureHighlight && (<FeatureHighlight onClose={closeFeatureHighlight} />)}

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
        closeSettings={closeSettings}
      />
    )}
     
     <FloatingReadButton 
       onRead={handleTTS}
       onCreateVideo={handleCreateVideo}
       isVisible={isEnhanced} // ✅ Always visible when enhanced, regardless of TTS state
     />
     
     <VideoQuoteModal
       isOpen={isVideoModalOpen}
       onClose={closeVideoModal}
       selectedText={selectedTextForVideo}
       bookTitle={bookTitle}
       author={bookAuthor}
       coverUrl={currentBook?.coverUrl || null}
     />
   </div>
 );
};

export default Reader;
