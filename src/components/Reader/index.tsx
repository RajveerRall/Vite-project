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
    currentChapterTitle,
  } = useBook();
  
  // Ref for reading progress tracking
  const readerMainRef = useRef<HTMLDivElement>(null);
  
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
    setTtsSpeed
  } = settingsHook;
  
  const ttsHook = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent,
    selectedVoice,
    ttsSpeed: ttsSpeed // Use actual speed setting instead of hardcoded 1
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
    anonymousLimit
  } = ttsHook;

  const { scrollToHighlight } = useAutoScroll({
    isActive: isSpeaking || isProcessing || isPaused,
    highlightedContent: ttsHighlightedContent,
    scrollContainer: document.querySelector('.reader-main') as HTMLElement | null
  });

  const readingProgress = useReadingProgress(readerMainRef, currentPageDisplay);


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
          onStopTTS={handleStopTTS}
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
