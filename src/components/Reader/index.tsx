import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBook } from '../../context/BookContext';
import SimplePlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
// import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import { TOCItem } from '../../types/books';
import { trackEvent } from '../../lib/analytics';
import './Reader.css';
import './ReaderThemes.css';
import FeatureHighlight from './FeatureHighlight';
import { ChevronLeft, ChevronRight, Headphones } from 'lucide-react';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { useReaderTTS } from '../../hooks/useReaderTTS';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import SettingsWidget from './SettingsWidget';
import MobileTOCDrawer from './MobileTOCDrawer';
import EnhancedLoader from './EnhancedLoader';
import FloatingReadButton from './FloatingReadButton';
import VideoQuoteModal from './VideoQuoteModal';
import { requestFullCast, ttsForLine } from '../../services/fullCastTTS';


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

  // === Non-TTS States ===
  const [showFeatureHighlight, setShowFeatureHighlight] = useState<boolean>(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  
  // Video Quote Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedTextForVideo, setSelectedTextForVideo] = useState('');
  
  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);
  
  // Ref for reading progress tracking
  const readerMainRef = useRef<HTMLDivElement>(null);
  
  // === Chapter Navigation Arrows ===
  const [showNavigationArrows, setShowNavigationArrows] = useState<boolean>(false);
  const [arrowsTimeout, setArrowsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Full Cast UI state
  const [fullCastActive, setFullCastActive] = useState(false);
  const [fullCastStatus, setFullCastStatus] = useState<string>('');
  const [fullCastBuffered, setFullCastBuffered] = useState<number>(0);
  const [fullCastNeedsTap, setFullCastNeedsTap] = useState<boolean>(false);
  const [fullCastPaused, setFullCastPaused] = useState<boolean>(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);
  
  // Mobile detection effect
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // Check if this is the first time opening this book (newly uploaded)
  // Books that have been opened before will have a lastRead timestamp
  const isFirstOpen = !currentBook?.lastRead || 
                      (Date.now() - new Date(currentBook.lastRead).getTime() < 5000);
  
  // Defer feature highlight to improve initial load performance
  // Only show on first open (when book is newly uploaded)
  useEffect(() => {
    if (isFirstOpen) {
      const timer = setTimeout(() => setShowFeatureHighlight(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isFirstOpen]);

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
    setPlaybackRate
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

  const handleCreateVideo = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';
    
    if (selectedText) {
      setSelectedTextForVideo(selectedText);
      setIsVideoModalOpen(true);
    }
  }, []);

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

  // Track user interaction for beforeunload event
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Track user interaction when they start full cast
  useEffect(() => {
    if (fullCastActive) {
      setHasUserInteracted(true);
    }
  }, [fullCastActive]);

  // Browser close warning when full cast is playing
  useEffect(() => {
    // Debug function to check current state
    const debugState = () => {
      console.log('Full Cast State:', {
        fullCastActive,
        hasStartedPlaying,
        hasUserInteracted,
        fullCastPaused,
        shouldShowWarning: fullCastActive && hasStartedPlaying && hasUserInteracted
      });
    };

    // Standard-compliant beforeunload handler
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      debugState(); // Log current state
      
      // Only show warning if full cast is active, audio has started playing, and user has interacted
      if (fullCastActive && hasStartedPlaying && hasUserInteracted) {
        console.log('beforeunload triggered - showing warning');
        
        // Modern browsers require preventDefault() to be called
        event.preventDefault();
        // Set returnValue to empty string (modern browsers ignore custom messages)
        event.returnValue = '';
        
        // Return empty string (required for some browsers)
        return '';
      }
    };

    // Only add the event listener if we have user interaction
    // This is required by modern browsers
    if (fullCastActive && hasStartedPlaying && hasUserInteracted) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    // Also handle page visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden && fullCastActive && hasStartedPlaying) {
        console.log('Page hidden while audiobook is playing');
        // You could add additional logic here if needed
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle pagehide event (more reliable for navigation)
    const handlePageHide = () => {
      if (fullCastActive && hasStartedPlaying) {
        console.log('Page hide event triggered while audiobook is playing');
        // This is more reliable for browser navigation
      }
    };
    
    window.addEventListener('pagehide', handlePageHide);
    
    // Expose debug function globally for testing
    (window as any).debugFullCastState = debugState;
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      delete (window as any).debugFullCastState;
    };
  }, [fullCastActive, hasStartedPlaying, hasUserInteracted, fullCastPaused]);

  // Handle Full Cast requests from Controls (Streaming controller)
  useEffect(() => {
    const handler = async () => {
      const fullText = (currentPageText || currentContent || '').trim();
      if (!fullText) return;

      // Track Full Cast processing start
      trackEvent('full_cast_processing_start', {
        text_length: fullText.length,
        page_number: currentPageDisplay
      });

      // Fire-and-forget: warm up Kokoro via microserver to reduce cold starts
      try {
        const { triggerKokoroWakeup } = await import('../../utils/kokoroWakeup');
        triggerKokoroWakeup();
      } catch {}

      // Split by blank lines (paragraphs) and then into fixed-size segments to cap payload size
      const MAX_CHARS = 2400;
      const paras = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const chunks: string[] = [];
      const sources = paras.length > 0 ? paras : [fullText];
      for (const src of sources) {
        const t = src.trim();
        if (!t) continue;
        for (let i = 0; i < t.length; i += MAX_CHARS) {
          chunks.push(t.slice(i, i + MAX_CHARS));
        }
      }

      let isPlaying = true;
      let isFetching = false;
      const LOOKAHEAD = 3; // number of audio items to buffer
      const audioQueue: Array<{ blob: Blob; line: { dialogue: string; provider?: string; voiceId?: string } }> = [];
      const audio = new Audio();
      let chunkIndex = 0;
      let startTs = 0;

      // Initialize UI state
      setFullCastActive(true);
      setFullCastStatus('Starting…');
      setFullCastBuffered(0);
      setFullCastNeedsTap(false);
      setFullCastPaused(false);
      setHasStartedPlaying(false);
      (window as any).__fullCastAudio = audio;

      const produce = async () => {
        if (!isPlaying || isFetching) return;
        if (audioQueue.length >= LOOKAHEAD) return;
        if (chunkIndex >= chunks.length) {
          // Track Full Cast completion when all chunks are processed
          if (chunkIndex === chunks.length && audioQueue.length === 0) {
            trackEvent('full_cast_completed', {
              total_chunks: chunks.length,
              total_text_length: fullText.length,
              page_number: currentPageDisplay
            });
          }
          return;
        }
        const currentIdx = chunkIndex; // tentative chunk index
        isFetching = true;
        setFullCastStatus(`Casting (chunk ${currentIdx + 1}/${chunks.length})…`);
        const chunk = chunks[currentIdx];
        let producedAny = false;
        try {
          const { script } = await requestFullCast(chunk, { llm: 'gemini-2.0-flash', parser: 'chatThread', useVoiceCasting: true });
          const lines = Array.isArray(script) ? script : [];
          // Fetch audio sequentially per line to reduce burst load
          for (const line of lines as any[]) {
            if (!isPlaying) break;
            const dialogue: string = line?.dialogue || line?.line || '';
            if (!dialogue) continue;
            const provider = line?.provider as string | undefined;
            const voiceId = line?.voiceId as string | undefined;
            try {
              const blob = await ttsForLine(dialogue, provider, voiceId);
              audioQueue.push({ blob, line: { dialogue, provider, voiceId } });
              setFullCastBuffered(audioQueue.length);
              producedAny = true;
            } catch (e) {
              console.error('[Full Cast] TTS failed for line', e);
              trackEvent('full_cast_tts_error', {
                error: e instanceof Error ? e.message : String(e),
                chunk_index: currentIdx,
                line_dialogue: dialogue.substring(0, 100) // First 100 chars for context
              });
            }
          }
        } catch (e) {
          console.error('[Full Cast] casting failed for chunk', e);
          trackEvent('full_cast_casting_error', {
            error: e instanceof Error ? e.message : String(e),
            chunk_index: currentIdx,
            chunk_length: chunk.length
          });
        } finally {
          isFetching = false;
          // Advance chunk index only if we produced at least one audio item
          if (producedAny) {
            chunkIndex = currentIdx + 1;
          } else {
            // Retry the same chunk after a short backoff
            if (isPlaying) {
              setTimeout(() => { if (isPlaying) produce(); }, 800);
              return;
            }
          }
          // Keep producing until lookahead is satisfied or no chunks left
          if (isPlaying && audioQueue.length < LOOKAHEAD) {
            produce();
          }
        }
      };

      const consume = async () => {
        if (!isPlaying) return;
        if (audioQueue.length === 0) {
          // Try to produce more and retry soon
          produce();
          // Only show buffering status if we haven't started playing yet
          if (!hasStartedPlaying) {
            setFullCastStatus('Buffering…');
          }
          setTimeout(consume, 300);
          return;
        }
        const { blob } = audioQueue.shift()!;
        setFullCastBuffered(audioQueue.length);
        const url = URL.createObjectURL(blob);
        audio.src = url;
        audio.onplay = () => { 
          startTs = Date.now(); 
          setFullCastStatus('Playing…'); 
          setHasStartedPlaying(true);
        };
        audio.onended = () => {
          URL.revokeObjectURL(url);
          const elapsed = Math.max(0, Math.round((Date.now() - startTs) / 1000));
          try { window.dispatchEvent(new CustomEvent('tts-usage-updated', { detail: { seconds: elapsed } })); } catch {}
          // Top up buffer while playing next
          produce();
          consume();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          consume();
        };
        try { await audio.play(); } catch (e) {
          console.error('[Full Cast] play failed', e);
          setFullCastNeedsTap(true);
          setFullCastStatus('Tap to start audio');
        }
      };

      // Expose stop so a new request cancels the current one
      const pause = () => {
        try { audio.pause(); } catch {}
        isPlaying = false;
        setFullCastPaused(true);
        setFullCastStatus('Paused');
      };

      const resume = async () => {
        if (isPlaying) return;
        isPlaying = true;
        setFullCastPaused(false);
        try {
          await audio.play();
          setFullCastStatus('Playing…');
        } catch (e) {
          console.error('[Full Cast] resume play failed', e);
          setFullCastNeedsTap(true);
          setFullCastStatus('Tap to start audio');
        }
        produce();
        consume();
      };

      const stop = () => { try { isPlaying = false; audio.pause(); audio.src = ''; } catch {} finally { setFullCastActive(false); setFullCastNeedsTap(false); setFullCastPaused(false); setHasStartedPlaying(false); } };
      (window as any).__fullCastStop = stop;
      (window as any).__fullCastPause = pause;
      (window as any).__fullCastResume = resume;

      // Kick off producer/consumer
      produce();
      consume();
    };
    window.addEventListener('full-cast-request', handler as any);
    return () => window.removeEventListener('full-cast-request', handler as any);
  }, [currentPageText, currentContent]);

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
            <MobileTOCDrawer 
              toc={toc} 
              onItemClick={handleNavigateToTocItem}
              theme={theme}
              openByDefault={isMobile && isFirstOpen}
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

        {/* Full Cast waiting overlay - show during startup/casting/buffering before playback */}
        {(fullCastActive && !hasStartedPlaying && (
          fullCastStatus === 'Starting…' ||
          fullCastStatus === 'Buffering…' ||
          fullCastStatus.startsWith('Casting')
        )) && (
          <div className="simple-loading-overlay">
            <div className="simple-loading-content">
              <div className="simple-spinner"></div>
              <div className="simple-text-section">
                <h3 className="simple-primary-text">Preparing Full Cast Audiobook</h3>
                <p className="simple-secondary-text">
                  This may take a few minutes as we generate character voices and buffer audio.
                  {fullCastStatus ? ` Status: ${fullCastStatus}` : ''}
                  {fullCastBuffered > 0 ? ` • Buffered: ${fullCastBuffered}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="reader-sidebar hidden md:block">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>

      <div className="reader-main" ref={readerMainRef}>
        <div
          className="epub-content"
          onClick={handlePageClick}
          onContextMenu={(e) => {
            // Prevent native context menu on text selection to avoid obstruction
            e.preventDefault();
          }}
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
          readingProgress={readingProgress}
          onReadAloud={handleTTS}
          onStopTTS={handleStopTTS}
          onPreviousSentence={handlePreviousSentence}
          onNextSentence={handleNextSentence}
          isReading={isSpeaking}
          isPaused={isPaused}
          isProcessing={isProcessing && !(isSpeaking || isPaused)}
          canResume={canTTSResume}
          // onAudiobook={togglePlayMode}
          // isPlayModeActive={isPlayModeVisible}
          isReadButtonActive={isSpeaking || isPaused || canTTSResume}
          // Progress tracking
          currentChunkIndex={_currentChunkIndex}
          totalChunks={_chunks.length}
          // Speed control
          ttsSpeed={ttsSpeed}
          onSpeedChange={handleSpeedChangeWithStop}
          // Settings
          onOpenSettings={toggleSettings}
          // Interactive Progress Bar handlers
          onPreviewScroll={handlePreviewScroll}
          onSeekToPercentage={handleSeekToPercentage}
          fullCastActive={fullCastActive}
          fullCastStatus={fullCastStatus}
          fullCastBuffered={fullCastBuffered}
          fullCastNeedsTap={fullCastNeedsTap}
            fullCastPaused={fullCastPaused}
          onFullCastStop={() => { 
            trackEvent('full_cast_stop', { 
              status: fullCastStatus,
              buffered: fullCastBuffered 
            });
            try { (window as any).__fullCastStop?.(); } catch {} 
          }}
            onFullCastPause={() => { 
              trackEvent('full_cast_pause', { 
                status: fullCastStatus,
                buffered: fullCastBuffered 
              });
              try { (window as any).__fullCastPause?.(); } catch {} 
            }}
            onFullCastResume={() => { 
              trackEvent('full_cast_resume', { 
                status: fullCastStatus,
                buffered: fullCastBuffered 
              });
              try { (window as any).__fullCastResume?.(); } catch {} 
            }}
        />
      </div>
    </div>

    <div className="reader-bottom-controls-desktop hidden md:block fixed bottom-6 left-1/2 transform -translate-x-1/2 rounded-full shadow-xl border border-gray-200 z-30">
      <div className="px-6 py-3">
        <Controls
          readingProgress={readingProgress}
          onReadAloud={handleTTS}
          onStopTTS={handleStopTTS}
          onPreviousSentence={handlePreviousSentence}
          onNextSentence={handleNextSentence}
          isReading={isSpeaking}
          isPaused={isPaused}
          isProcessing={isProcessing && !(isSpeaking || isPaused)}
          canResume={canTTSResume}
          // onAudiobook={togglePlayMode}
          // isPlayModeActive={isPlayModeVisible}
          isReadButtonActive={isSpeaking || isPaused || canTTSResume}
          // Progress tracking
          currentChunkIndex={_currentChunkIndex}
          totalChunks={_chunks.length}
          // Speed control
          ttsSpeed={ttsSpeed}
          onSpeedChange={handleSpeedChangeWithStop}
          // Settings
          onOpenSettings={toggleSettings}
          // Interactive Progress Bar handlers
          onPreviewScroll={handlePreviewScroll}
          onSeekToPercentage={handleSeekToPercentage}
          fullCastActive={fullCastActive}
          fullCastStatus={fullCastStatus}
          fullCastBuffered={fullCastBuffered}
          fullCastNeedsTap={fullCastNeedsTap}
          fullCastPaused={fullCastPaused}
          onFullCastStop={() => { try { (window as any).__fullCastStop?.(); } catch {} }}
          onFullCastPause={() => { try { (window as any).__fullCastPause?.(); } catch {} }}
          onFullCastResume={() => { try { (window as any).__fullCastResume?.(); } catch {} }}
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
       onClose={() => setIsVideoModalOpen(false)}
       selectedText={selectedTextForVideo}
       bookTitle={bookTitle}
       author={bookAuthor}
       coverUrl={currentBook?.coverUrl || null}
     />
   </div>
 );
};

export default Reader;
