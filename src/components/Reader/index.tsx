import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useBook } from '../../context/BookContext';
import SimplePlayMode from './SimplePlayMode';
import KokoroPlayMode from './SimplePlayMode';
import TableOfContents from '../Library/TableOfContents';
// import SearchBar from '../Library/SearchBar';
import Controls from './Controls';
import { TOCItem } from '../../types/books';
import './Reader.css';
import FeatureHighlight from './FeatureHighlight';
import { ChevronLeft, ChevronRight, Play, Headphones, Menu, X, Settings } from 'lucide-react';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { useReaderTTS } from '../../hooks/useReaderTTS';
import SettingsWidget from './SettingsWidget';


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
  const [isTocDrawerOpen, setIsTocDrawerOpen] = useState<boolean>(false);
  
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
    resumeIndex,
    hasFinishedPlayback,
    useKokoroTTS,
    highlightedContent,
    handleTTS,
    handleStopTTS,
    pausePlayback,
    resumePlayback,
    handleTTSNavigation,
    canTTSResume
  } = useReaderTTS({
    bookTitle,
    currentPageDisplay,
    currentPageText,
    currentContent
  });

  // === Computed Values ===
  const canGoPrev = currentPageDisplay > 0;
  const canGoNext = currentPageDisplay < totalPages - 1;

  // === TTS Logic moved to useReaderTTS hook ===

  // Mobile TOC drawer functions
  const toggleTocDrawer = useCallback(() => {
    setIsTocDrawerOpen(prev => !prev);
  }, []);

  const closeTocDrawer = useCallback(() => {
    setIsTocDrawerOpen(false);
  }, []);



  // Navigation handlers wrapped to stop TTS
  const handleNavigateToTocItem = useCallback((item: TOCItem) => {
    handleTTSNavigation();
    navigateToTocItem(item);
    closeTocDrawer(); // Close mobile drawer after navigation
  }, [handleTTSNavigation, navigateToTocItem, closeTocDrawer]);

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

        {/* Mobile TOC Button */}
        <button 
          onClick={toggleTocDrawer}
          className="mobile-toc-button md:hidden p-2 text-gray-600 hover:text-amber-800 transition-colors mr-2"
          aria-label="Toggle Table of Contents"
        >
          <Menu className="w-5 h-5" />
        </button>
        
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
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>
            {isLoading && !currentContent && !isProcessing ? 'Loading book content...' : ''}
            {isProcessing && !isSpeaking && !isPaused ? 'Preparing audio...' : ''}
          </p>
        </div>
      ) : null}
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="reader-sidebar hidden md:block">
        <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
      </div>
      
      {/* Mobile TOC Drawer */}
      {isTocDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="toc-drawer-backdrop md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeTocDrawer}
          />
          
          {/* Drawer */}
          <div className="toc-drawer md:hidden fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">Table of Contents</h3>
              <button 
                onClick={closeTocDrawer}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close Table of Contents"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <TableOfContents items={toc} onItemClick={handleNavigateToTocItem} />
            </div>
          </div>
        </>
      )}
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

    <style>{`
      .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: #fffb91;
        border-radius: 3px;
      }
      
      /* Theme CSS Variables */
      .theme-light {
        --reader-bg: #ffffff;
        --reader-text: #1f2937;
        --reader-text-secondary: #6b7280;
        --reader-border: #e5e7eb;
        --reader-header-bg: #ffffff;
        --reader-sidebar-bg: #f9fafb;
        --reader-content-bg: #ffffff;
        --reader-hover: #f3f4f6;
        --reader-shadow: rgba(0, 0, 0, 0.1);
        --reader-highlight: #fffb91;
      }
      
      .theme-dark {
        --reader-bg: #111827;
        --reader-text: #f9fafb;
        --reader-text-secondary: #9ca3af;
        --reader-border: #374151;
        --reader-header-bg: #1f2937;
        --reader-sidebar-bg: #1f2937;
        --reader-content-bg: #111827;
        --reader-hover: #374151;
        --reader-shadow: rgba(0, 0, 0, 0.3);
        --reader-highlight: #fbbf24;
      }
      
      .theme-sepia {
        --reader-bg: #f7f3e9;
        --reader-text: #3c2e26;
        --reader-text-secondary: #8b6914;
        --reader-border: #e6d4b1;
        --reader-header-bg: #f0e68c;
        --reader-sidebar-bg: #faf7ed;
        --reader-content-bg: #faf8f0;
        --reader-hover: #f3f0e1;
        --reader-shadow: rgba(139, 105, 20, 0.1);
        --reader-highlight: #fde047;
      }
      
      /* Apply theme variables */
      .reader {
        background-color: var(--reader-bg);
        color: var(--reader-text);
        transition: background-color 0.3s ease, color 0.3s ease;
      }
      
      .reader-header {
        background-color: var(--reader-header-bg);
        border-bottom: 1px solid var(--reader-border);
        color: var(--reader-text);
      }
      
      .reader-sidebar {
        background-color: var(--reader-sidebar-bg);
        border-right: 1px solid var(--reader-border);
      }
      
      .reader-main {
        background-color: var(--reader-content-bg);
      }
      
      .epub-content {
        background-color: var(--reader-content-bg);
        color: var(--reader-text);
        transition: font-size 0.2s ease, background-color 0.3s ease, color 0.3s ease;
      }
      
      /* Theme-aware text colors */
      .theme-light .book-title,
      .theme-dark .book-title,
      .theme-sepia .book-title {
        color: var(--reader-text);
      }
      
      .theme-light .book-author,
      .theme-dark .book-author,
      .theme-sepia .book-author {
        color: var(--reader-text-secondary);
      }
      
      /* Theme-aware button styles */
      .theme-light .back-button,
      .theme-dark .back-button,
      .theme-sepia .back-button {
        color: var(--reader-text-secondary);
      }
      
      .theme-light .back-button:hover,
      .theme-dark .back-button:hover,
      .theme-sepia .back-button:hover {
        color: #d97706;
      }
      
      .theme-light .settings-button,
      .theme-light .mobile-toc-button,
      .theme-dark .settings-button,
      .theme-dark .mobile-toc-button,
      .theme-sepia .settings-button,
      .theme-sepia .mobile-toc-button {
        color: var(--reader-text-secondary);
      }
      
      .theme-light .settings-button:hover,
      .theme-light .mobile-toc-button:hover,
      .theme-dark .settings-button:hover,
      .theme-dark .mobile-toc-button:hover,
      .theme-sepia .settings-button:hover,
      .theme-sepia .mobile-toc-button:hover {
        color: #d97706;
      }
      
      /* Theme-aware highlight for TTS */
      .theme-light .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: var(--reader-highlight);
        color: #1f2937;
      }
      
      .theme-dark .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: var(--reader-highlight);
        color: #111827;
      }
      
      .theme-sepia .${CHUNK_HIGHLIGHT_CLASS} {
        background-color: var(--reader-highlight);
        color: #3c2e26;
      }
      
      /* Theme-aware TOC drawer */
      .theme-dark .toc-drawer,
      .theme-sepia .toc-drawer {
        background-color: var(--reader-sidebar-bg);
        color: var(--reader-text);
      }
      
      .theme-dark .toc-drawer .border-gray-200,
      .theme-sepia .toc-drawer .border-gray-200 {
        border-color: var(--reader-border);
      }
      
      /* Settings widget theme adaptation */
      .theme-dark .settings-widget,
      .theme-sepia .settings-widget {
        background-color: var(--reader-sidebar-bg);
        border-color: var(--reader-border);
        color: var(--reader-text);
      }
      
      .theme-dark .settings-widget .text-gray-800,
      .theme-sepia .settings-widget .text-gray-800 {
        color: var(--reader-text);
      }
      
      .theme-dark .settings-widget .text-gray-700,
      .theme-sepia .settings-widget .text-gray-700 {
        color: var(--reader-text-secondary);
      }
      
      .theme-dark .settings-widget .bg-gray-50,
      .theme-sepia .settings-widget .bg-gray-50 {
        background-color: var(--reader-hover);
      }
      
      .theme-dark .settings-widget .bg-white,
      .theme-sepia .settings-widget .bg-white {
        background-color: var(--reader-content-bg);
        border-color: var(--reader-border);
      }
      
      .theme-dark .settings-widget .border-gray-200,
      .theme-sepia .settings-widget .border-gray-200 {
        border-color: var(--reader-border);
      }
      
      .theme-dark .settings-widget .border-gray-100,
      .theme-sepia .settings-widget .border-gray-100 {
        border-color: var(--reader-border);
      }
      
      /* Settings widget animations */
      .settings-widget {
        animation: slideInUp 0.2s ease-out;
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Settings backdrop animation */
      .settings-backdrop {
        animation: fadeIn 0.2s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      /* Mobile responsiveness for settings widget */
      @media (max-width: 640px) {
        .settings-widget {
          bottom: 1rem;
          right: 1rem;
          left: 1rem;
          min-width: auto;
          max-width: none;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
      }
      
      /* Extra small screens and phones in landscape */
      @media (max-width: 480px) {
        .settings-widget {
          bottom: 0.5rem;
          right: 0.5rem;
          left: 0.5rem;
          max-height: calc(100vh - 1rem);
          border-radius: 12px 12px 0 0;
          padding: 1rem;
        }
      }
      
      /* Very small screens */
      @media (max-width: 360px) {
        .settings-widget {
          bottom: 0;
          right: 0;
          left: 0;
          border-radius: 16px 16px 0 0;
          max-height: 85vh;
          padding: 1rem 0.75rem;
        }
        
        .settings-widget .grid-cols-3 {
          grid-template-columns: 1fr;
          gap: 0.5rem;
        }
        
        .settings-widget .flex.items-center.space-x-3 {
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .settings-widget .flex.items-center.space-x-3 > * {
          margin: 0;
        }
      }
      
      /* Smooth transitions for theme changes */
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
      
      /* Ensure proper contrast for all themes */
      .theme-dark input,
      .theme-sepia input {
        background-color: var(--reader-content-bg);
        color: var(--reader-text);
        border-color: var(--reader-border);
      }
      
      .theme-dark button,
      .theme-sepia button {
        color: var(--reader-text);
      }
      
      /* Loading overlay theme adaptation */
      .theme-dark .loading-overlay,
      .theme-sepia .loading-overlay {
        background-color: var(--reader-bg);
        color: var(--reader-text);
      }
      
      /* Mobile header responsiveness */
      @media (max-width: 768px) {
        .reader-header {
          padding: 0.5rem;
          min-height: 60px;
        }
        
        .reader-left .back-button {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
        
        .reader-left .back-button .w-4 {
          width: 0.875rem;
          height: 0.875rem;
        }
        
        .reader-center {
          flex: 1;
          min-width: 0;
          padding: 0 0.5rem;
        }
        
        .reader-center .book-title {
          font-size: 0.9rem;
          line-height: 1.2;
          margin-bottom: 0.125rem;
        }
        
        .reader-center .book-author {
          font-size: 0.75rem;
        }
        
        .reader-right {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .settings-button,
        .mobile-toc-button {
          padding: 0.375rem;
          margin-right: 0.25rem;
        }
        
        .settings-button .w-5,
        .mobile-toc-button .w-5 {
          width: 1rem;
          height: 1rem;
        }
        
        .controls-container {
          margin-left: 0.25rem;
        }
      }
      
      /* Extra small mobile screens */
      @media (max-width: 480px) {
        .reader-header {
          padding: 0.375rem;
          min-height: 56px;
        }
        
        .reader-left .back-button {
          font-size: 0.7rem;
          padding: 0.25rem;
        }
        
        .reader-center .book-title {
          font-size: 0.8rem;
        }
        
        .reader-center .book-author {
          font-size: 0.7rem;
        }
        
        .settings-button,
        .mobile-toc-button {
          padding: 0.25rem;
          margin-right: 0.125rem;
        }
        
        .settings-button .w-5,
        .mobile-toc-button .w-5 {
          width: 0.875rem;
          height: 0.875rem;
        }
      }
      
      /* Landscape phone adjustments */
      @media (max-width: 768px) and (orientation: landscape) {
        .reader-header {
          min-height: 48px;
          padding: 0.25rem 0.5rem;
        }
        
        .reader-center .book-title {
          font-size: 0.8rem;
        }
        
        .reader-center .book-author {
          font-size: 0.7rem;
        }
      }
      
      /* Controls component theme adaptation */
      .theme-light .control-button {
        background-color: #f9fafb;
        border-color: #e5e7eb;
        color: #374151;
      }
      
      .theme-dark .control-button {
        background-color: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }
      
      .theme-sepia .control-button {
        background-color: #faf7ed;
        border-color: #e6d4b1;
        color: #3c2e26;
      }
      
      /* Control button hover states */
      .theme-light .control-button:hover:not(:disabled) {
        background-color: #f3f4f6;
        border-color: #d1d5db;
      }
      
      .theme-dark .control-button:hover:not(:disabled) {
        background-color: #4b5563;
        border-color: #6b7280;
      }
      
      .theme-sepia .control-button:hover:not(:disabled) {
        background-color: #f3f0e1;
        border-color: #d4c399;
      }
      
      /* Active control buttons (all themes keep amber) */
      .theme-light .control-button.active,
      .theme-dark .control-button.active,
      .theme-sepia .control-button.active {
        background-color: #92400e;
        border-color: #92400e;
        color: white;
      }
      
      .theme-light .control-button.active:hover:not(:disabled),
      .theme-dark .control-button.active:hover:not(:disabled),
      .theme-sepia .control-button.active:hover:not(:disabled) {
        background-color: #78350f;
      }
      
      /* Stop button theme adaptation */
      .theme-light .control-button.stop-button {
        background-color: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      
      .theme-dark .control-button.stop-button {
        background-color: #450a0a;
        border-color: #7f1d1d;
        color: #fca5a5;
      }
      
      .theme-sepia .control-button.stop-button {
        background-color: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      
      .theme-light .control-button.stop-button:hover:not(:disabled) {
        background-color: #fee2e2;
        border-color: #fca5a5;
      }
      
      .theme-dark .control-button.stop-button:hover:not(:disabled) {
        background-color: #7f1d1d;
        border-color: #991b1b;
      }
      
      .theme-sepia .control-button.stop-button:hover:not(:disabled) {
        background-color: #fee2e2;
        border-color: #fca5a5;
      }
      
      /* Page info theme adaptation */
      .theme-light .page-info {
        color: #4b5563;
      }
      
      .theme-dark .page-info {
        color: #9ca3af;
      }
      
      .theme-sepia .page-info {
        color: #8b6914;
      }
      
      /* Fix audiobook button hiding on mobile - override Controls.css */
      @media (max-width: 768px) {
        .control-button.hidden {
          display: none !important;
        }
      }
    `}</style>
  </div>
 );
};

export default Reader;
