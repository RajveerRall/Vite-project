import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useBook } from '../../context/BookContext';
import SimplePlayMode from './SimplePlayMode';
import EnhancedLoader from './EnhancedLoader';
import FeatureHighlight from './FeatureHighlight';
import FloatingReadButton from './FloatingReadButton';
import VideoQuoteModal from './VideoQuoteModal';
import SettingsWidget from './SettingsWidget';
import SidePanelBar from './SidePanelBar';
import SidePanelContent from './SidePanelContent';
import './Reader.css';
import './ReaderThemes.css';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { useReaderTTS } from '../../hooks/useReaderTTS';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { useAutoScrollToNextPage } from '../../hooks/useAutoScrollToNextPage';
// Phase 1: Import new hooks
import { useFullCast, useReaderNavigation, useReaderUI, useMobileDetection } from '../../hooks/reader';
// Phase 3: Import extracted components
import { ReaderHeader } from './ReaderHeader';
import { ReaderContent } from './ReaderContent';
import { FullCastOverlay } from './FullCastOverlay';
import { ReaderControlsContainer } from './ReaderControlsContainer';
import { SubscriptionLimitModal } from '../Subscription/SubscriptionLimitModal';
import { useSubscription } from '../../context/SubscriptionContext';

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
    htmlFiles,
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
  
  // Subscription context for limit checking
  const { isLimitExceeded, refreshUsageLimit } = useSubscription();
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  
  // Side panel state - replace old sidebar state
  const [activePanel, setActivePanel] = useState<'toc' | 'ai-chat' | null>('toc');
  const [isDraggingHandle, setIsDraggingHandle] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartWidth, setDragStartWidth] = useState<number>(350);
  const contentPanelRef = useRef<HTMLDivElement>(null);
  
  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setIsDraggingHandle(true);
    setDragStartX(clientX);
    setDragStartWidth(activePanel !== null ? 350 : 0);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingHandle) return;
    
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = clientX - dragStartX;
    const newWidth = Math.max(0, Math.min(350, dragStartWidth + deltaX));
    
    if (contentPanelRef.current) {
      contentPanelRef.current.style.width = `${newWidth}px`;
      contentPanelRef.current.style.padding = newWidth > 0 ? '1rem' : '0';
      contentPanelRef.current.style.overflow = newWidth > 0 ? 'auto' : 'hidden';
      
      // Visual feedback
      if (newWidth < 175) {
        contentPanelRef.current.classList.add('will-collapse');
        contentPanelRef.current.classList.remove('will-expand');
      } else {
        contentPanelRef.current.classList.add('will-expand');
        contentPanelRef.current.classList.remove('will-collapse');
      }
    }
  }, [isDraggingHandle, dragStartX, dragStartWidth]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDraggingHandle) return;
    
    setIsDraggingHandle(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    if (contentPanelRef.current) {
      const finalWidth = parseInt(contentPanelRef.current.style.width) || 0;
      const threshold = 175;
      
      if (finalWidth > threshold) {
        // Keep panel open (don't change activePanel if it's already set)
        if (activePanel === null) {
          setActivePanel('toc');
        }
        contentPanelRef.current.style.width = '350px';
        contentPanelRef.current.style.padding = '1rem';
        contentPanelRef.current.style.overflow = 'auto';
      } else {
        // Close panel
        setActivePanel(null);
        contentPanelRef.current.style.width = '0px';
        contentPanelRef.current.style.padding = '0';
        contentPanelRef.current.style.overflow = 'hidden';
      }
      
      // Clean up visual feedback classes
      contentPanelRef.current.classList.remove('will-collapse', 'will-expand');
    }
  }, [isDraggingHandle, activePanel]);

  // Add event listeners for drag
  useEffect(() => {
    if (isDraggingHandle) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDraggingHandle, handleDragMove, handleDragEnd]);
  
  // Listen for limit exceeded events from TTS tracker
  React.useEffect(() => {
    const handleLimitExceeded = () => {
      setShowLimitModal(true);
      refreshUsageLimit();
    };
    
    window.addEventListener('tts-limit-exceeded', handleLimitExceeded);
    return () => window.removeEventListener('tts-limit-exceeded', handleLimitExceeded);
  }, [refreshUsageLimit]);
  
  const uiState = useReaderUI({
    currentBook,
    toc,
    currentPageDisplay,
    htmlFiles,
    contentRef: readerMainRef,
  });
  const {
    isVideoModalOpen,
    selectedTextForVideo,
    openVideoModal,
    closeVideoModal,
    showFeatureHighlight,
    closeFeatureHighlight,
    showNavigationArrows,
    showPrevArrow,
    showNextArrow,
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
    hasFinishedPlayback,
    bufferedChunksCount
  } = ttsHook;
  
  // Also check subscription limit status (moved here after isSpeaking/isProcessing are defined)
  React.useEffect(() => {
    if (isLimitExceeded && (isSpeaking || isProcessing)) {
      setShowLimitModal(true);
    }
  }, [isLimitExceeded, isSpeaking, isProcessing]);
  
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
  
  // Detect if current book is PDF for auto-scroll feature
  const isPdfBook = React.useMemo(() => {
    if (!currentBook?.file) return false;
    const fileName = currentBook.file.name.toLowerCase();
    const fileType = currentBook.file.type.toLowerCase();
    return fileName.endsWith('.pdf') || fileType === 'application/pdf';
  }, [currentBook]);
  
  // Auto-scroll to next/previous page when reaching bottom/top (for PDFs and similar formats)
  useAutoScrollToNextPage({
    enabled: isPdfBook, // Enable for PDFs
    contentRef: readerMainRef,
    currentPage: currentPageDisplay,
    totalPages: totalPages,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    isPageLoading: isPageLoading,
    threshold: 20, // Trigger when within 20px of bottom/top
  });

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

      <SidePanelBar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        theme={theme}
      />

      <SidePanelContent
        activePanel={activePanel}
        onClose={() => setActivePanel(null)}
        toc={toc}
        onNavigateToTocItem={handleNavigateToTocItem}
        theme={theme}
        contentPanelRef={contentPanelRef}
        isDraggingHandle={isDraggingHandle}
        onDragStart={handleDragStart}
      />

        <ReaderContent
          content={currentContent}
          highlightedContent={isPdfBook ? undefined : ttsHighlightedContent}
          onPageClick={handlePageClick}
          onChapterNavigation={handleChapterNavigation}
          showNavigationArrows={showNavigationArrows}
          showPrevArrow={showPrevArrow}
          showNextArrow={showNextArrow}
          fontSize={fontSize}
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
          bufferedChunksCount={bufferedChunksCount}
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
     
     {/* Subscription Limit Modal */}
     <SubscriptionLimitModal
       isOpen={showLimitModal}
       onClose={() => setShowLimitModal(false)}
       onUpgrade={() => {
         // TODO: Implement subscription upgrade flow (Phase 3)
         console.log('[Reader] Subscription upgrade clicked');
         setShowLimitModal(false);
       }}
     />
   </div>
 );
};

export default Reader;
